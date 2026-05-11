from __future__ import annotations

import json
from pathlib import Path

import numpy as np


FEATURE_NAMES = ["open", "high", "low", "close", "volume"]
TARGET_INDEX = FEATURE_NAMES.index("close")


class FeatureScaler:
    def __init__(self, minimums: np.ndarray, maximums: np.ndarray):
        self.minimums = minimums.astype(np.float32)
        self.maximums = maximums.astype(np.float32)
        span = self.maximums - self.minimums
        self.scale = np.where(span == 0, 1.0, span).astype(np.float32)

    @classmethod
    def fit(cls, values: np.ndarray) -> "FeatureScaler":
        return cls(values.min(axis=0), values.max(axis=0))

    def transform(self, values: np.ndarray) -> np.ndarray:
        return ((values - self.minimums) / self.scale).astype(np.float32)

    def inverse_transform(self, values: np.ndarray) -> np.ndarray:
        return (values * self.scale) + self.minimums

    def inverse_close(self, normalized_close: float) -> float:
        return float((normalized_close * self.scale[TARGET_INDEX]) + self.minimums[TARGET_INDEX])

    def to_dict(self) -> dict[str, list[float]]:
        return {
            "feature_names": FEATURE_NAMES,
            "minimums": self.minimums.tolist(),
            "maximums": self.maximums.tolist(),
        }

    @classmethod
    def from_dict(cls, payload: dict[str, list[float]]) -> "FeatureScaler":
        return cls(
            minimums=np.array(payload["minimums"], dtype=np.float32),
            maximums=np.array(payload["maximums"], dtype=np.float32),
        )


def chronological_train_val_split(
    values: np.ndarray,
    train_ratio: float = 0.8,
) -> tuple[np.ndarray, np.ndarray]:
    split_index = max(1, int(len(values) * train_ratio))
    return values[:split_index], values[split_index:]


def build_sliding_windows(
    scaled_values: np.ndarray,
    window_size: int = 60,
    stride: int = 1,
) -> tuple[np.ndarray, np.ndarray]:
    samples: list[np.ndarray] = []
    labels: list[float] = []

    for start in range(0, len(scaled_values) - window_size, stride):
        end = start + window_size
        label_index = end
        if label_index >= len(scaled_values):
            break
        samples.append(scaled_values[start:end])
        labels.append(float(scaled_values[label_index, TARGET_INDEX]))

    if not samples:
        return (
            np.empty((0, window_size, len(FEATURE_NAMES)), dtype=np.float32),
            np.empty((0, 1), dtype=np.float32),
        )

    return np.array(samples, dtype=np.float32), np.array(labels, dtype=np.float32).reshape(-1, 1)


def save_scaler(scaler: FeatureScaler, path: Path) -> None:
    path.write_text(json.dumps(scaler.to_dict(), indent=2), encoding="utf-8")


def load_scaler(path: Path) -> FeatureScaler:
    return FeatureScaler.from_dict(json.loads(path.read_text(encoding="utf-8")))
