import asyncio
import logging
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.predict import router as predict_router
from app.routers.stocks import router as stocks_router
from app.services.data_fetcher import safe_refresh_latest_prices, safe_seed_historical_prices
from app.services.db import close_pool, init_pool
from app.services.predictor import load_predictor_artifacts


scheduler = AsyncIOScheduler()
logger = logging.getLogger(__name__)
load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_pool()
    load_predictor_artifacts()
    scheduler.add_job(safe_refresh_latest_prices, "interval", minutes=5, id="stock-refresh")
    scheduler.start()
    asyncio.create_task(_run_initial_market_sync())
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        await close_pool()


async def _run_initial_market_sync() -> None:
    try:
        await safe_seed_historical_prices()
        await safe_refresh_latest_prices(force=True)
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.warning("Initial market sync failed: %s", exc)


app = FastAPI(title="Stock Predictor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks_router, prefix="/stocks", tags=["stocks"])
app.include_router(predict_router, prefix="/predict", tags=["predict"])


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}
