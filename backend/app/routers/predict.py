from fastapi import APIRouter

from app.models.schemas import PredictionResponse
from app.services.predictor import predict_next_close


router = APIRouter()


@router.get("/{symbol}", response_model=PredictionResponse)
async def predict(symbol: str):
    return await predict_next_close(symbol)

