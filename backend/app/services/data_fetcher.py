import json
import logging
import os
from asyncio import to_thread
from datetime import UTC, date, datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

from app.services.db import upsert_price_rows


load_dotenv()
logger = logging.getLogger(__name__)
EASTERN_TZ = ZoneInfo("America/New_York")
TIINGO_BASE_URL = "https://api.tiingo.com"


def _configured_symbols() -> list[str]:
    return [
        item.strip().upper()
        for item in os.getenv("DEFAULT_SYMBOLS", "AAPL,MSFT,NVDA").split(",")
        if item.strip()
    ]


def _tiingo_api_key() -> str:
    api_key = os.getenv("TIINGO_API_KEY")
    if not api_key:
        raise RuntimeError("TIINGO_API_KEY is not configured.")
    return api_key


def _is_market_hours(now: datetime | None = None) -> bool:
    current = (now or datetime.now(EASTERN_TZ)).astimezone(EASTERN_TZ)
    if current.weekday() >= 5:
        return False

    current_minutes = (current.hour * 60) + current.minute
    market_open = (9 * 60) + 30
    market_close = 16 * 60
    return market_open <= current_minutes <= market_close


def _parse_timestamp(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _request_json(path: str, params: dict[str, str]) -> list[dict[str, object]]:
    query = urlencode({**params, "token": _tiingo_api_key()})
    request = Request(
        f"{TIINGO_BASE_URL}{path}?{query}",
        headers={"Content-Type": "application/json"},
    )

    try:
        with urlopen(request, timeout=20) as response:
            payload = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Tiingo request failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Unable to reach Tiingo: {exc.reason}") from exc

    decoded = json.loads(payload)
    if not isinstance(decoded, list):
        raise RuntimeError("Unexpected Tiingo response payload.")
    return decoded


def _daily_rows(symbol: str, payload: list[dict[str, object]]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for item in payload:
        rows.append(
            {
                "symbol": symbol,
                "timestamp": _parse_timestamp(str(item["date"])),
                "open": float(item["open"]),
                "high": float(item["high"]),
                "low": float(item["low"]),
                "close": float(item["close"]),
                "volume": int(item["volume"]),
            }
        )
    return rows


def _intraday_rows(symbol: str, payload: list[dict[str, object]]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for item in payload:
        rows.append(
            {
                "symbol": symbol,
                "timestamp": _parse_timestamp(str(item["date"])),
                "open": float(item["open"]),
                "high": float(item["high"]),
                "low": float(item["low"]),
                "close": float(item["close"]),
                "volume": int(item["volume"]),
            }
        )
    return rows


def _fetch_symbol_seed(symbol: str) -> list[dict[str, object]]:
    end_date = date.today()
    start_date = end_date - timedelta(days=90)
    payload = _request_json(
        f"/tiingo/daily/{symbol}/prices",
        {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "resampleFreq": "daily",
        },
    )
    return _daily_rows(symbol, payload)


def _fetch_symbol_intraday(symbol: str) -> list[dict[str, object]]:
    now = datetime.now(EASTERN_TZ)
    start_date = now.date().isoformat()
    end_date = now.date().isoformat()
    payload = _request_json(
        f"/iex/{symbol}/prices",
        {
            "startDate": start_date,
            "endDate": end_date,
            "resampleFreq": "1min",
            "columns": "date,open,high,low,close,volume",
        },
    )
    return _intraday_rows(symbol, payload)


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


async def safe_seed_historical_prices() -> int:
    try:
        return await seed_historical_prices()
    except Exception as exc:  # pragma: no cover - network/provider guard
        logger.warning("Historical Tiingo seed failed: %s", exc)
        return 0


async def safe_refresh_latest_prices(force: bool = False) -> int:
    try:
        return await refresh_latest_prices(force=force)
    except Exception as exc:  # pragma: no cover - network/provider guard
        logger.warning("Tiingo refresh failed: %s", exc)
        return 0
