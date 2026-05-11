from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
import logging
from pathlib import Path

import numpy as np
import torch
from fastapi import HTTPException

from app.models.schemas import PredictionResponse
from app.services.db import (
    fetch_recent_feature_rows,
    fetch_recent_prediction_errors,
    insert_prediction,
)
from ml.lstm_model import StockLSTM
from ml.preprocess import FEATURE_NAMES, FeatureScaler, load_scaler


WINDOW_SIZE = 60
MODEL_DIR = Path(__file__).resolve().parents[2] / "ml"
MODEL_PATH = MODEL_DIR / "model.pt"
SCALER_PATH = MODEL_DIR / "scaler.json"
logger = logging.getLogger(__name__)


@dataclass
class PredictorArtifacts:
    model: StockLSTM
    scaler: FeatureScaler
    device: torch.device


_artifacts: PredictorArtifacts | None = None
_load_error: str | None = None


def load_predictor_artifacts() -> None:
    global _artifacts, _load_error

    device = torch.device("cpu")
    model = StockLSTM().to(device)

    try:
        state_dict = torch.load(MODEL_PATH, map_location=device)
        model.load_state_dict(state_dict)
        model.eval()
        scaler = load_scaler(SCALER_PATH)
    except Exception as exc:  # pragma: no cover - defensive path for missing artifacts
        _artifacts = None
        _load_error = str(exc)
        return

    _artifacts = PredictorArtifacts(model=model, scaler=scaler, device=device)
    _load_error = None


def _next_trading_day(start_day: date) -> date:
    next_day = start_day + timedelta(days=1)
    while next_day.weekday() >= 5:
        next_day += timedelta(days=1)
    return next_day


def _build_feature_tensor(rows: list[dict[str, object]], scaler: FeatureScaler) -> torch.Tensor:
    matrix = np.array(
        [
            [
                float(row["open"]),
                float(row["high"]),
                float(row["low"]),
                float(row["close"]),
                float(row["volume"]),
            ]
            for row in rows
        ],
        dtype=np.float32,
    )
    normalized = scaler.transform(matrix)
    return torch.from_numpy(normalized.reshape(1, WINDOW_SIZE, len(FEATURE_NAMES)))


async def predict_next_close(symbol: str) -> PredictionResponse:
    if _artifacts is None:
        detail = _load_error or "Model artifacts are not loaded."
        raise HTTPException(status_code=503, detail=detail)

    symbol = symbol.upper()
    rows = await fetch_recent_feature_rows(symbol, limit=WINDOW_SIZE)
    if len(rows) < WINDOW_SIZE:
        raise HTTPException(
            status_code=404,
            detail=f"Not enough price history for {symbol}. Need at least {WINDOW_SIZE} rows.",
        )

    tensor = _build_feature_tensor(rows, _artifacts.scaler).to(_artifacts.device)
    with torch.no_grad():
        normalized_prediction = float(_artifacts.model(tensor).squeeze().cpu().item())

    predicted_close = _artifacts.scaler.inverse_close(normalized_prediction)
    latest_timestamp = rows[-1]["timestamp"]
    if not isinstance(latest_timestamp, datetime):
        latest_timestamp = datetime.now(UTC)
    predicted_for_date = _next_trading_day(latest_timestamp.astimezone(UTC).date())

    try:
        recent_errors = await fetch_recent_prediction_errors(symbol, limit=30)
    except Exception as exc:  # pragma: no cover - schema/data guard
        logger.warning("Could not load recent prediction errors for %s: %s", symbol, exc)
        recent_errors = []

    if recent_errors:
        interval_radius = 1.5 * float(np.mean(recent_errors))
    else:
        interval_radius = max(predicted_close * 0.03, 1.0)

    confidence_low = predicted_close - interval_radius
    confidence_high = predicted_close + interval_radius

    try:
        await insert_prediction(
            symbol=symbol,
            predicted_close=predicted_close,
            confidence_low=confidence_low,
            confidence_high=confidence_high,
            predicted_for_date=predicted_for_date,
        )
    except Exception as exc:  # pragma: no cover - schema/data guard
        logger.warning("Could not persist prediction for %s: %s", symbol, exc)

    return PredictionResponse(
        symbol=symbol,
        predicted_close=predicted_close,
        confidence_low=confidence_low,
        confidence_high=confidence_high,
        predicted_for_date=predicted_for_date,
    )
