from __future__ import annotations

from dataclasses import dataclass
import json
import os
from pathlib import Path
from datetime import date, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
import pandas as pd
import torch
from dotenv import load_dotenv
from torch import nn
from torch.optim import Adam
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.utils.data import DataLoader, TensorDataset

from ml.lstm_model import StockLSTM
from ml.preprocess import (
    FEATURE_NAMES,
    FeatureScaler,
    TARGET_INDEX,
    build_sliding_windows,
    chronological_train_val_split,
    save_scaler,
)


SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA"]
WINDOW_SIZE = 60
BATCH_SIZE = 32
EPOCHS = 100
LEARNING_RATE = 1e-3
TIINGO_BASE_URL = "https://api.tiingo.com"

load_dotenv()


@dataclass
class DatasetBundle:
    x_train: np.ndarray
    y_train: np.ndarray
    x_val: np.ndarray
    y_val: np.ndarray
    scaler: FeatureScaler


def _windows_from_blocks(
    blocks: list[np.ndarray],
    scaler: FeatureScaler,
) -> tuple[np.ndarray, np.ndarray]:
    feature_windows: list[np.ndarray] = []
    label_windows: list[np.ndarray] = []

    for block in blocks:
        scaled_block = scaler.transform(block)
        features, labels = build_sliding_windows(scaled_block, window_size=WINDOW_SIZE)
        if len(features) == 0:
            continue
        feature_windows.append(features)
        label_windows.append(labels)

    if not feature_windows:
        return (
            np.empty((0, WINDOW_SIZE, len(FEATURE_NAMES)), dtype=np.float32),
            np.empty((0, 1), dtype=np.float32),
        )

    return np.vstack(feature_windows), np.vstack(label_windows)


def _download_symbol_frame(symbol: str) -> pd.DataFrame:
    api_key = os.getenv("TIINGO_API_KEY")
    if not api_key:
        raise RuntimeError("TIINGO_API_KEY is required for offline training.")

    end_date = date.today()
    start_date = end_date - timedelta(days=365 * 5)
    query = urlencode(
        {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "resampleFreq": "daily",
            "token": api_key,
        }
    )
    request = Request(
        f"{TIINGO_BASE_URL}/tiingo/daily/{symbol}/prices?{query}",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Tiingo training download failed for {symbol}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Unable to reach Tiingo for {symbol}: {exc.reason}") from exc

    frame = pd.DataFrame(payload)
    if frame.empty:
        raise RuntimeError(f"No training data returned for {symbol}.")

    frame.columns = [str(column).lower() for column in frame.columns]
    frame["timestamp"] = pd.to_datetime(frame["date"], utc=True)
    frame["symbol"] = symbol
    return frame[["timestamp", "symbol", "open", "high", "low", "close", "volume"]]


def load_training_dataframe() -> pd.DataFrame:
    frames = [_download_symbol_frame(symbol) for symbol in SYMBOLS]
    dataset = pd.concat(frames, ignore_index=True)
    dataset = dataset.sort_values(["symbol", "timestamp"]).reset_index(drop=True)
    return dataset


def build_datasets(dataset: pd.DataFrame) -> DatasetBundle:
    train_feature_blocks: list[np.ndarray] = []
    val_feature_blocks: list[np.ndarray] = []
    scaler_fit_blocks: list[np.ndarray] = []

    for symbol in dataset["symbol"].unique():
        symbol_values = (
            dataset.loc[dataset["symbol"] == symbol, FEATURE_NAMES].astype(np.float32).to_numpy()
        )
        if len(symbol_values) <= WINDOW_SIZE:
            continue

        train_values, val_values = chronological_train_val_split(symbol_values, train_ratio=0.8)
        if len(train_values) <= WINDOW_SIZE:
            continue

        scaler_fit_blocks.append(train_values)
        train_feature_blocks.append(train_values)

        if len(val_values) > 0:
            val_feature_blocks.append(np.vstack([train_values[-WINDOW_SIZE:], val_values]))

    if not train_feature_blocks or not scaler_fit_blocks:
        raise RuntimeError("No symbol had enough rows for training.")

    scaler = FeatureScaler.fit(np.vstack(scaler_fit_blocks))
    x_train, y_train = _windows_from_blocks(train_feature_blocks, scaler)
    fallback_val_blocks = [train_feature_blocks[-1][-(WINDOW_SIZE + 1) :]]
    x_val, y_val = _windows_from_blocks(val_feature_blocks or fallback_val_blocks, scaler)

    if len(x_train) == 0 or len(x_val) == 0:
        raise RuntimeError("Dataset generation produced no train/validation windows.")

    return DatasetBundle(x_train=x_train, y_train=y_train, x_val=x_val, y_val=y_val, scaler=scaler)


def make_loader(features: np.ndarray, labels: np.ndarray, shuffle: bool) -> DataLoader:
    dataset = TensorDataset(torch.from_numpy(features), torch.from_numpy(labels))
    return DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=shuffle)


def evaluate(
    model: StockLSTM,
    loader: DataLoader,
    scaler: FeatureScaler,
    device: torch.device,
) -> tuple[float, float, float, float]:
    model.eval()
    losses: list[float] = []
    predictions: list[float] = []
    actuals: list[float] = []
    directional_hits = 0
    directional_total = 0

    with torch.no_grad():
        for batch_x, batch_y in loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)
            outputs = model(batch_x)
            loss = nn.functional.mse_loss(outputs, batch_y)
            losses.append(float(loss.item()))

            output_values = outputs.squeeze(-1).cpu().numpy()
            actual_values = batch_y.squeeze(-1).cpu().numpy()

            predictions.extend(scaler.inverse_close(value) for value in output_values)
            actuals.extend(scaler.inverse_close(value) for value in actual_values)

            previous_close = batch_x[:, -1, TARGET_INDEX].cpu().numpy()
            predicted_direction = output_values - previous_close
            actual_direction = actual_values - previous_close
            directional_hits += int(np.sum((predicted_direction >= 0) == (actual_direction >= 0)))
            directional_total += len(output_values)

    mae = float(np.mean(np.abs(np.array(predictions) - np.array(actuals))))
    rmse = float(np.sqrt(np.mean((np.array(predictions) - np.array(actuals)) ** 2)))
    directional_accuracy = directional_hits / directional_total if directional_total else 0.0
    return float(np.mean(losses)), mae, rmse, directional_accuracy


def train() -> None:
    dataset = load_training_dataframe()
    bundle = build_datasets(dataset)

    device = torch.device("cpu")
    model = StockLSTM().to(device)
    optimizer = Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=8)
    criterion = nn.MSELoss()

    train_loader = make_loader(bundle.x_train, bundle.y_train, shuffle=False)
    val_loader = make_loader(bundle.x_val, bundle.y_val, shuffle=False)

    output_dir = Path(__file__).resolve().parent
    model_path = output_dir / "model.pt"
    scaler_path = output_dir / "scaler.json"

    best_val_loss = float("inf")
    best_state: dict[str, torch.Tensor] | None = None

    for epoch in range(1, EPOCHS + 1):
        model.train()
        epoch_losses: list[float] = []
        for batch_x, batch_y in train_loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)

            optimizer.zero_grad()
            predictions = model(batch_x)
            loss = criterion(predictions, batch_y)
            loss.backward()
            optimizer.step()
            epoch_losses.append(float(loss.item()))

        val_loss, mae, rmse, directional_accuracy = evaluate(model, val_loader, bundle.scaler, device)
        scheduler.step(val_loss)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}

        print(
            f"epoch={epoch:03d} "
            f"train_loss={np.mean(epoch_losses):.6f} "
            f"val_loss={val_loss:.6f} "
            f"mae={mae:.4f} "
            f"rmse={rmse:.4f} "
            f"directional_accuracy={directional_accuracy:.4f}"
        )

    if best_state is None:
        raise RuntimeError("Training completed without a checkpoint.")

    torch.save(best_state, model_path)
    save_scaler(bundle.scaler, scaler_path)
    print(f"Saved best checkpoint to {model_path}")
    print(f"Saved scaler parameters to {scaler_path}")


if __name__ == "__main__":
    train()
