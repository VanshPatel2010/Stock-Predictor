from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class StockPriceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockSummaryResponse(BaseModel):
    symbol: str
    latest_price: float = Field(alias="latestPrice")
    percent_change: float = Field(alias="percentChange")
    timestamp: datetime

    model_config = ConfigDict(populate_by_name=True)


class PredictionResponse(BaseModel):
    symbol: str
    predicted_close: float = Field(alias="predictedClose")
    confidence_low: float = Field(alias="confidenceLow")
    confidence_high: float = Field(alias="confidenceHigh")
    predicted_for_date: date = Field(alias="predictedForDate")

    model_config = ConfigDict(populate_by_name=True)
