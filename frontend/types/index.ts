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
  confidenceLow: number;
  confidenceHigh: number;
  predictedForDate: string;
};

export type StockSummary = {
  symbol: string;
  latestPrice: number;
  percentChange: number;
  timestamp: string;
};

export type WatchlistItem = {
  symbol: string;
  latestPrice: number;
  percentChange: number;
};

export type ChartPoint = StockPricePoint & {
  predictedClose?: number;
  predictedHigh?: number;
  predictedLow?: number;
  isBullish: boolean;
  candleBody: number;
  candleBase: number;
  wickLow: number;
  wickHigh: number;
};
