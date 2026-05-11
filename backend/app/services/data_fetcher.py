import os
from datetime import datetime, timezone

import yfinance as yf
from dotenv import load_dotenv

from app.services.db import upsert_price_rows


load_dotenv()


async def refresh_latest_prices() -> None:
    symbols = os.getenv("DEFAULT_SYMBOLS", "AAPL,MSFT,NVDA").split(",")
    rows: list[dict[str, object]] = []

    for symbol in [item.strip().upper() for item in symbols if item.strip()]:
        ticker = yf.Ticker(symbol)
        history = ticker.history(period="5d", interval="1d")
        if history.empty:
            continue

        latest = history.iloc[-1]
        rows.append(
            {
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc),
                "open": float(latest["Open"]),
                "high": float(latest["High"]),
                "low": float(latest["Low"]),
                "close": float(latest["Close"]),
                "volume": int(latest["Volume"]),
            }
        )

    await upsert_price_rows(rows)

