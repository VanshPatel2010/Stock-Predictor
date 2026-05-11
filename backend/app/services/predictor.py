from datetime import timedelta, timezone, datetime

from app.models.schemas import PredictionResponse


async def predict_next_close(symbol: str) -> PredictionResponse:
    # Placeholder inference response until model loading is wired into live data.
    predicted_close = 192.44
    spread = 2.6
    next_day = datetime.now(timezone.utc).date() + timedelta(days=1)
    return PredictionResponse(
        symbol=symbol.upper(),
        predicted_close=predicted_close,
        confidence_low=predicted_close - spread,
        confidence_high=predicted_close + spread,
        predicted_for_date=next_day,
    )
