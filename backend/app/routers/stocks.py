from fastapi import APIRouter, Query

from app.models.schemas import StockPriceResponse, StockSummaryResponse
from app.services.db import fetch_price_history, fetch_stock_summaries


router = APIRouter()


@router.get("", response_model=list[StockSummaryResponse])
async def list_stocks():
    return await fetch_stock_summaries()


@router.get("/history/{symbol}", response_model=list[StockPriceResponse])
async def history(symbol: str, days: int = Query(default=60, ge=1, le=365)):
    return await fetch_price_history(symbol, days=days)
