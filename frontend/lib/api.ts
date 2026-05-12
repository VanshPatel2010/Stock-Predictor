import {
  ForecastPoint,
  HistoricalPredictionPoint,
  NewsArticle,
  NewsSentiment,
  Prediction,
  StockPricePoint,
  StockNews,
  StockSummary
} from "@/types";

export type { NewsArticle, NewsSentiment, StockNews } from "@/types";

const apiProxyBaseUrl = process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/api";

export async function fetchStocks(): Promise<StockSummary[]> {
  const response = await fetch(`${apiProxyBaseUrl}/stocks`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch stocks.");
  }

  return response.json();
}

export async function fetchHistory(
  symbol: string,
  days = 60
): Promise<StockPricePoint[]> {
  const response = await fetch(
    `${apiProxyBaseUrl}/history/${encodeURIComponent(symbol)}?days=${days}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch history.");
  }

  return response.json();
}

export async function fetchPrediction(symbol: string): Promise<Prediction> {
  const response = await fetch(
    `${apiProxyBaseUrl}/predict/${encodeURIComponent(symbol)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch prediction.");
  }

  return response.json();
}

export async function fetchForecast(
  symbol: string,
  days = 5
): Promise<ForecastPoint[]> {
  const response = await fetch(
    `${apiProxyBaseUrl}/predict/${encodeURIComponent(symbol)}/forecast?days=${days}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Forecast fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return data.forecast as ForecastPoint[];
}

export async function fetchPredictionHistory(
  symbol: string,
  days = 30
): Promise<HistoricalPredictionPoint[]> {
  const response = await fetch(
    `${apiProxyBaseUrl}/predict/${encodeURIComponent(symbol)}/history?days=${days}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Prediction history fetch failed: ${response.status}`);
  }

  const data = await response.json();
  return data.predictions as HistoricalPredictionPoint[];
}

export async function fetchStockNews(symbol: string): Promise<StockNews> {
  const response = await fetch(
    `${apiProxyBaseUrl}/news/${encodeURIComponent(symbol)}?days=7`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`News fetch failed: ${response.status}`);
  }

  return response.json();
}
