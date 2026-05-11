import os
from asyncio import to_thread
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

import yfinance as yf
from dotenv import load_dotenv

from app.services.db import upsert_price_rows


load_dotenv()
EASTERN_TZ = ZoneInfo("America/New_York")


def _configured_symbols() -> list[str]:
    return [
        item.strip().upper()
        for item in os.getenv("DEFAULT_SYMBOLS", "AAPL,MSFT,NVDA").split(",")
        if item.strip()
    ]


def _is_market_hours(now: datetime | None = None) -> bool:
    current = (now or datetime.now(EASTERN_TZ)).astimezone(EASTERN_TZ)
    if current.weekday() >= 5:
        return False

    current_minutes = (current.hour * 60) + current.minute
    market_open = (9 * 60) + 30
    market_close = 16 * 60
    return market_open <= current_minutes <= market_close


def _normalize_timestamp(value: object) -> datetime:
    timestamp = value.to_pydatetime() if hasattr(value, "to_pydatetime") else value
    if not isinstance(timestamp, datetime):
        raise TypeError("Unsupported timestamp value from yfinance.")
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=EASTERN_TZ).astimezone(UTC)
    return timestamp.astimezone(UTC)


def _rows_from_frame(symbol: str, frame) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for index, row in frame.iterrows():
        rows.append(
            {
                "symbol": symbol,
                "timestamp": _normalize_timestamp(index),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"]),
            }
        )
    return rows


def _fetch_symbol_seed(symbol: str) -> list[dict[str, object]]:
    history = yf.Ticker(symbol).history(period="60d", interval="1d", auto_adjust=False)
    if history.empty:
        return []
    return _rows_from_frame(symbol, history)


def _fetch_symbol_intraday(symbol: str) -> list[dict[str, object]]:
    ticks = yf.download(
        tickers=symbol,
        period="1d",
        interval="1m",
        progress=False,
        auto_adjust=False,
        threads=False,
    )
    if ticks.empty:
        return []
    return _rows_from_frame(symbol, ticks)


async def seed_historical_prices() -> int:
    rows: list[dict[str, object]] = []
    for symbol in _configured_symbols():
        rows.extend(await to_thread(_fetch_symbol_seed, symbol))
    return await upsert_price_rows(rows)


async def refresh_latest_prices(force: bool = False) -> int:
    if not force and not _is_market_hours():
        return 0

    rows: list[dict[str, object]] = []
    for symbol in _configured_symbols():
        rows.extend(await to_thread(_fetch_symbol_intraday, symbol))

    return await upsert_price_rows(rows)
