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

export type ForecastPoint = {
  date: string;
  predicted_close: number;
  confidence_low: number;
  confidence_high: number;
};

export type HistoricalPredictionPoint = {
  date: string;
  predicted_close: number;
  confidence_low: number;
  confidence_high: number;
  forecast_day: number;
};

export type NewsArticle = {
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  published_at: string;
  category: string;
};

export type NewsSentiment = {
  bullish_percent: number;
  bearish_percent: number;
  buzz_score: number;
  articles_this_week: number;
  overall: "bullish" | "bearish" | "neutral";
};

export type StockNews = {
  symbol: string;
  sentiment: NewsSentiment;
  articles: NewsArticle[];
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
