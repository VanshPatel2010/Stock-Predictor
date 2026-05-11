import numpy as np
from sklearn.preprocessing import MinMaxScaler


def build_windows(series: np.ndarray, window_size: int = 60):
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(series.reshape(-1, 1))

    x, y = [], []
    for index in range(window_size, len(scaled)):
        x.append(scaled[index - window_size : index])
        y.append(scaled[index])

    return np.array(x), np.array(y), scaler

