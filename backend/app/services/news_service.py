from __future__ import annotations

import asyncio
import os
from datetime import date, datetime, timedelta, timezone

import httpx


FINNHUB_BASE = "https://finnhub.io/api/v1"
_client: httpx.AsyncClient | None = None


def _finnhub_key() -> str:
    return os.getenv("FINNHUB_API_KEY", "")


def get_client() -> httpx.AsyncClient:
    global _client

    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=8.0)
    return _client


async def close_client() -> None:
    global _client

    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


def _require_finnhub_key() -> str:
    api_key = _finnhub_key()
    if not api_key:
        raise RuntimeError("FINNHUB_API_KEY is not configured.")
    return api_key


async def fetch_company_news(symbol: str, days_back: int = 7) -> list[dict]:
    to_date = date.today()
    from_date = to_date - timedelta(days=days_back)

    response = await get_client().get(
        f"{FINNHUB_BASE}/company-news",
        params={
            "symbol": symbol.upper(),
            "from": from_date.isoformat(),
            "to": to_date.isoformat(),
            "token": _require_finnhub_key(),
        },
    )
    response.raise_for_status()
    articles: list[dict] = response.json()

    seen: set[str] = set()
    unique: list[dict] = []
    for article in sorted(articles, key=lambda item: item.get("datetime", 0), reverse=True):
        headline = str(article.get("headline", "")).strip()
        if headline and headline not in seen:
            seen.add(headline)
            unique.append(article)
        if len(unique) >= 20:
            break

    return unique


async def fetch_news_sentiment(symbol: str) -> dict:
    try:
        response = await get_client().get(
            f"{FINNHUB_BASE}/news-sentiment",
            params={
                "symbol": symbol.upper(),
                "token": _require_finnhub_key(),
            },
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        return {}


def _unix_to_iso(timestamp: int | float | str | None) -> str:
    try:
        return datetime.fromtimestamp(float(timestamp or 0), tz=timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%S"
        )
    except Exception:
        return ""


async def fetch_news_with_sentiment(symbol: str, days_back: int = 7) -> dict:
    articles_raw, sentiment_raw = await asyncio.gather(
        fetch_company_news(symbol, days_back=days_back),
        fetch_news_sentiment(symbol),
    )

    sentiment = sentiment_raw.get("sentiment", {})
    buzz = sentiment_raw.get("buzz", {})
    bullish = float(sentiment.get("bullishPercent", 0.5) or 0.5)
    bearish = float(sentiment.get("bearishPercent", 0.5) or 0.5)

    if bullish >= 0.60:
        overall = "bullish"
    elif bearish >= 0.60:
        overall = "bearish"
    else:
        overall = "neutral"

    articles = [
        {
            "headline": article.get("headline", ""),
            "summary": article.get("summary", ""),
            "source": article.get("source", ""),
            "url": article.get("url", ""),
            "image": article.get("image", ""),
            "published_at": _unix_to_iso(article.get("datetime")),
            "category": article.get("category", ""),
        }
        for article in articles_raw
    ]

    return {
        "symbol": symbol.upper(),
        "sentiment": {
            "bullish_percent": round(bullish, 4),
            "bearish_percent": round(bearish, 4),
            "buzz_score": round(float(buzz.get("buzz", 0) or 0), 4),
            "articles_this_week": int(buzz.get("articlesInLastWeek", 0) or 0),
            "overall": overall,
        },
        "articles": articles,
    }
