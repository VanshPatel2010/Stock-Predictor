from datetime import datetime, timezone

from app.models.schemas import PredictionResponse


async def predict_next_close(symbol: str) -> PredictionResponse:
    # Placeholder inference response until model loading is wired into live data.
    predicted_close = 192.44
    spread = 2.6
    return PredictionResponse(
        symbol=symbol.upper(),
        predicted_close=predicted_close,
        lower_bound=predicted_close - spread,
        upper_bound=predicted_close + spread,
        confidence=0.84,
        as_of=datetime.now(timezone.utc),
    )

