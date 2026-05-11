from fastapi import APIRouter, Query

from app.models.schemas import StockPriceResponse
from app.services.db import fetch_price_history, fetch_recent_prices


router = APIRouter()


@router.get("", response_model=list[StockPriceResponse])
async def list_stocks(symbol: str | None = Query(default=None)):
    return await fetch_recent_prices(symbol=symbol)


@router.get("/history/{symbol}", response_model=list[StockPriceResponse])
async def history(symbol: str):
    return await fetch_price_history(symbol)

