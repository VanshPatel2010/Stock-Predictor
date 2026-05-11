import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.predict import router as predict_router
from app.routers.stocks import router as stocks_router
from app.services.data_fetcher import refresh_latest_prices, seed_historical_prices
from app.services.db import close_pool, init_pool


scheduler = AsyncIOScheduler()
load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_pool()
    await seed_historical_prices()
    await refresh_latest_prices(force=True)
    scheduler.add_job(refresh_latest_prices, "interval", minutes=5, id="stock-refresh")
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        await close_pool()


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
