from datetime import datetime

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


class PredictionResponse(BaseModel):
    symbol: str
    predicted_close: float = Field(alias="predictedClose")
    lower_bound: float = Field(alias="lowerBound")
    upper_bound: float = Field(alias="upperBound")
    confidence: float
    as_of: datetime = Field(alias="asOf")

    model_config = ConfigDict(populate_by_name=True)

