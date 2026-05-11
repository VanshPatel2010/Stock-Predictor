import os
from typing import Any

import asyncpg
from dotenv import load_dotenv


load_dotenv()

_pool: asyncpg.Pool | None = None


async def init_pool() -> asyncpg.Pool:
    global _pool

    if _pool is None:
        database_url = os.getenv("SUPABASE_DB_URL")
        if not database_url:
            raise RuntimeError("SUPABASE_DB_URL is not configured.")
        _pool = await asyncpg.create_pool(database_url, min_size=1, max_size=5)

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
