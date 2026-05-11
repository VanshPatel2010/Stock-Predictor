export type StockPricePoint = {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Prediction = {
  symbol: string;
  predictedClose: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  asOf: string;
};

