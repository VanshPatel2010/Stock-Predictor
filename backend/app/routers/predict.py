from fastapi import APIRouter

from app.models.schemas import ForecastResponse, HistoricalPredictionResponse, PredictionResponse
from app.services.predictor import (
    get_prediction_history,
    predict_next_close,
    predict_next_n_days,
)


router = APIRouter()


@router.get("/{symbol}", response_model=PredictionResponse)
async def predict(symbol: str):
    return await predict_next_close(symbol)


@router.get("/{symbol}/forecast", response_model=ForecastResponse)
async def forecast(symbol: str, days: int = 5):
    days = max(1, min(days, 21))
    result = await predict_next_n_days(symbol, n=days)
    return {"symbol": symbol.upper(), "forecast": result}


@router.get("/{symbol}/history", response_model=HistoricalPredictionResponse)
async def history(symbol: str, days: int = 30):
    days = max(1, min(days, 90))
    result = await get_prediction_history(symbol, limit=days)
    return {"symbol": symbol.upper(), "predictions": result}
