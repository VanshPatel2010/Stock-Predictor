from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
import json
import logging
from pathlib import Path

import numpy as np
import pandas_market_calendars as mcal
import torch
from fastapi import HTTPException

from app.models.schemas import (
    ForecastPointResponse,
    HistoricalPredictionPointResponse,
    PredictionResponse,
)
from app.services.db import (
    fetch_prediction_history,
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
MAE_PATH = MODEL_DIR / "mae.json"
DEFAULT_MODEL_MAE = 2.5
logger = logging.getLogger(__name__)
NYSE_CALENDAR = mcal.get_calendar("NYSE")
MODEL_MAE = DEFAULT_MODEL_MAE


@dataclass
class PredictorArtifacts:
    model: StockLSTM
    scaler: FeatureScaler
    device: torch.device


_artifacts: PredictorArtifacts | None = None
_load_error: str | None = None


def load_predictor_artifacts() -> None:
    global _artifacts, _load_error, MODEL_MAE

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
    MODEL_MAE = _load_model_mae()
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


def _load_model_mae() -> float:
    try:
        payload = json.loads(MAE_PATH.read_text(encoding="utf-8"))
        value = float(payload["mae"])
        if value <= 0:
            raise ValueError("mae must be positive")
        return value
    except Exception as exc:  # pragma: no cover - defensive artifact fallback
        logger.warning("Falling back to default MODEL_MAE=%s: %s", DEFAULT_MODEL_MAE, exc)
        return DEFAULT_MODEL_MAE


def next_trading_days(from_date: date, n: int) -> list[date]:
    if n < 1:
        return []

    start_date = from_date + timedelta(days=1)
    end_date = start_date + timedelta(days=max(n * 5, 10))

    while True:
        schedule = NYSE_CALENDAR.schedule(start_date=start_date, end_date=end_date)
        trading_days = list(schedule.index[:n].date)
        if len(trading_days) >= n:
            return trading_days
        end_date += timedelta(days=max(n * 3, 7))


def _predict_normalized_close(window: np.ndarray) -> float:
    if _artifacts is None:
        detail = _load_error or "Model artifacts are not loaded."
        raise HTTPException(status_code=503, detail=detail)

    tensor = torch.from_numpy(window.reshape(1, WINDOW_SIZE, len(FEATURE_NAMES))).to(
        _artifacts.device
    )
    with torch.no_grad():
        return float(_artifacts.model(tensor).squeeze().cpu().item())


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

    tensor = _build_feature_tensor(rows, _artifacts.scaler).cpu().numpy()
    normalized_prediction = _predict_normalized_close(tensor.reshape(WINDOW_SIZE, len(FEATURE_NAMES)))

    predicted_close = _artifacts.scaler.inverse_close(normalized_prediction)
    latest_timestamp = rows[-1]["timestamp"]
    if not isinstance(latest_timestamp, datetime):
        latest_timestamp = datetime.now(UTC)
    predicted_for_date = next_trading_days(latest_timestamp.astimezone(UTC).date(), 1)
    predicted_for_date = predicted_for_date[0] if predicted_for_date else _next_trading_day(
        latest_timestamp.astimezone(UTC).date()
    )

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
            forecast_day=1,
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


async def predict_next_n_days(symbol: str, n: int = 5) -> list[ForecastPointResponse]:
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

    window = _build_feature_tensor(rows, _artifacts.scaler).cpu().numpy().reshape(
        WINDOW_SIZE, len(FEATURE_NAMES)
    )
    latest_timestamp = rows[-1]["timestamp"]
    if not isinstance(latest_timestamp, datetime):
        latest_timestamp = datetime.now(UTC)
    trading_days = next_trading_days(latest_timestamp.astimezone(UTC).date(), n)

    forecast: list[ForecastPointResponse] = []
    for index, forecast_date in enumerate(trading_days, start=1):
        normalized_prediction = _predict_normalized_close(window)
        predicted_close = _artifacts.scaler.inverse_close(normalized_prediction)
        confidence_low = predicted_close - (1.5 * MODEL_MAE)
        confidence_high = predicted_close + (1.5 * MODEL_MAE)

        forecast_point = ForecastPointResponse(
            date=forecast_date,
            predicted_close=predicted_close,
            confidence_low=confidence_low,
            confidence_high=confidence_high,
        )
        forecast.append(forecast_point)

        synthetic_row = np.zeros((len(FEATURE_NAMES),), dtype=np.float32)
        synthetic_row[:4] = normalized_prediction
        synthetic_row[4] = float(np.mean(window[-5:, 4]))
        window = np.vstack([window[1:], synthetic_row])

        try:
            await insert_prediction(
                symbol=symbol,
                predicted_close=predicted_close,
                confidence_low=confidence_low,
                confidence_high=confidence_high,
                predicted_for_date=forecast_date,
                forecast_day=index,
            )
        except Exception as exc:  # pragma: no cover - schema/data guard
            logger.warning(
                "Could not persist forecast day %s for %s: %s", index, symbol, exc
            )

    return forecast


async def get_prediction_history(
    symbol: str, limit: int = 30
) -> list[HistoricalPredictionPointResponse]:
    symbol = symbol.upper()
    rows = await fetch_prediction_history(symbol, limit=limit)
    return [
        HistoricalPredictionPointResponse(
            date=row["predicted_for_date"],
            predicted_close=float(row["predicted_close"]),
            confidence_low=float(row["confidence_low"]),
            confidence_high=float(row["confidence_high"]),
            forecast_day=int(row["forecast_day"]),
        )
        for row in rows
    ]
