import os
from urllib.parse import urlparse
from typing import Any

import asyncpg
from dotenv import load_dotenv


load_dotenv()

_pool: asyncpg.Pool | None = None


def _database_url() -> str:
    database_url = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("SUPABASE_DB_URL is not configured.")

    if "[YOUR-PASSWORD]" in database_url:
        raise RuntimeError(
            "SUPABASE_DB_URL still contains the placeholder '[YOUR-PASSWORD]'. "
            "Replace it with your actual Supabase database password."
        )

    if database_url.count("postgresql://") > 1:
        raise RuntimeError(
            "SUPABASE_DB_URL is malformed. It contains 'postgresql://' more than once. "
            "Use a single DSN in the format "
            "'postgresql://USER:PASSWORD@HOST:PORT/postgres'."
        )

    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgresql", "postgres"}:
        raise RuntimeError(
            "SUPABASE_DB_URL must start with 'postgresql://' or 'postgres://'."
        )

    if not parsed.hostname or not parsed.username:
        raise RuntimeError(
            "SUPABASE_DB_URL is missing required connection parts. "
            "Expected format: 'postgresql://USER:PASSWORD@HOST:PORT/postgres'."
        )

    return database_url


async def init_pool() -> asyncpg.Pool:
    global _pool

    if _pool is None:
        database_url = _database_url()
        _pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=5,
            statement_cache_size=0,
        )

    return _pool


async def close_pool() -> None:
    global _pool

    if _pool is not None:
        await _pool.close()
        _pool = None


async def fetch_recent_prices(symbol: str | None = None) -> list[dict[str, Any]]:
    if _pool is None:
        return []

    query = """
        select symbol, timestamp, open, high, low, close, volume
        from public.stock_prices
        where ($1::text is null or symbol = upper($1))
        order by timestamp desc
        limit 100
    """
    async with _pool.acquire() as connection:
        rows = await connection.fetch(query, symbol)
    return [dict(row) for row in rows]


async def fetch_stock_summaries() -> list[dict[str, Any]]:
    if _pool is None:
        return []

    query = """
        with ranked as (
            select
                symbol,
                timestamp,
                close,
                row_number() over (partition by symbol order by timestamp desc) as rn
            from public.stock_prices
        )
        select
            current.symbol,
            current.close as latest_price,
            case
                when previous.close is null or previous.close = 0 then 0
                else round((((current.close - previous.close) / previous.close) * 100)::numeric, 2)
            end as percent_change,
            current.timestamp
        from ranked current
        left join ranked previous
            on previous.symbol = current.symbol
           and previous.rn = 2
        where current.rn = 1
        order by current.symbol asc
    """
    async with _pool.acquire() as connection:
        rows = await connection.fetch(query)
    return [dict(row) for row in rows]


async def fetch_price_history(symbol: str, days: int = 60) -> list[dict[str, Any]]:
    if _pool is None:
        return []

    query = """
        select symbol, timestamp, open, high, low, close, volume
        from public.stock_prices
        where symbol = upper($1)
          and timestamp >= now() - make_interval(days => $2::int)
        order by timestamp asc
    """
    async with _pool.acquire() as connection:
        rows = await connection.fetch(query, symbol, days)
    return [dict(row) for row in rows]


async def fetch_recent_feature_rows(symbol: str, limit: int = 60) -> list[dict[str, Any]]:
    if _pool is None:
        return []

    query = """
        select symbol, timestamp, open, high, low, close, volume
        from public.stock_prices
        where symbol = upper($1)
        order by timestamp desc
        limit $2
    """
    async with _pool.acquire() as connection:
        rows = await connection.fetch(query, symbol, limit)
    return [dict(row) for row in reversed(rows)]


async def fetch_recent_prediction_errors(symbol: str, limit: int = 30) -> list[float]:
    if _pool is None:
        return []

    query = """
        with latest_daily_close as (
            select
                symbol,
                timestamp::date as trading_day,
                close,
                row_number() over (
                    partition by symbol, timestamp::date
                    order by timestamp desc
                ) as rn
            from public.stock_prices
            where symbol = upper($1)
        )
        select abs(pred.predicted_close - actual.close) as absolute_error
        from public.predictions pred
        join latest_daily_close actual
          on actual.symbol = pred.symbol
         and actual.trading_day = pred.predicted_for_date
         and actual.rn = 1
        where pred.symbol = upper($1)
        order by pred.created_at desc
        limit $2
    """
    async with _pool.acquire() as connection:
        rows = await connection.fetch(query, symbol, limit)
    return [float(row["absolute_error"]) for row in rows]


async def fetch_prediction_history(symbol: str, limit: int = 30) -> list[dict[str, Any]]:
    if _pool is None:
        return []

    query = """
        with ranked_predictions as (
            select
                symbol,
                predicted_close,
                confidence_low,
                confidence_high,
                predicted_for_date,
                forecast_day,
                created_at,
                row_number() over (
                    partition by symbol, predicted_for_date, forecast_day
                    order by created_at desc
                ) as rn
            from public.predictions
            where symbol = upper($1)
              and forecast_day = 1
              and predicted_for_date <= current_date
        )
        select
            symbol,
            predicted_close,
            confidence_low,
            confidence_high,
            predicted_for_date,
            forecast_day
        from ranked_predictions
        where rn = 1
        order by predicted_for_date desc
        limit $2
    """
    async with _pool.acquire() as connection:
        rows = await connection.fetch(query, symbol, limit)
    return [dict(row) for row in reversed(rows)]


async def insert_prediction(
    symbol: str,
    predicted_close: float,
    confidence_low: float,
    confidence_high: float,
    predicted_for_date,
    forecast_day: int = 1,
) -> None:
    if _pool is None:
        return

    query = """
        insert into public.predictions (
            symbol,
            predicted_close,
            confidence_low,
            confidence_high,
            predicted_for_date,
            forecast_day
        )
        values ($1, $2, $3, $4, $5, $6)
    """
    async with _pool.acquire() as connection:
        await connection.execute(
            query,
            symbol,
            predicted_close,
            confidence_low,
            confidence_high,
            predicted_for_date,
            forecast_day,
        )


async def upsert_price_rows(rows: list[dict[str, Any]]) -> int:
    if _pool is None or not rows:
        return 0

    query = """
        insert into public.stock_prices (symbol, timestamp, open, high, low, close, volume)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (symbol, timestamp) do update set
            open = excluded.open,
            high = excluded.high,
            low = excluded.low,
            close = excluded.close,
            volume = excluded.volume
    """
    inserted = 0
    async with _pool.acquire() as connection:
        async with connection.transaction():
            for row in rows:
                await connection.execute(
                    query,
                    row["symbol"],
                    row["timestamp"],
                    row["open"],
                    row["high"],
                    row["low"],
                    row["close"],
                    row["volume"],
                )
                inserted += 1

    return inserted
