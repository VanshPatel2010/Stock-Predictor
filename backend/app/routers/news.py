import httpx
from fastapi import APIRouter, HTTPException, Query

from app.services.news_service import fetch_news_with_sentiment


router = APIRouter(prefix="/news", tags=["news"])


@router.get("/{symbol}")
async def get_stock_news(symbol: str, days: int = Query(default=7, ge=1, le=30)):
    try:
        return await fetch_news_with_sentiment(symbol.upper(), days_back=days)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Finnhub error: {exc.response.text}",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
