import { Prediction, StockPricePoint, StockSummary } from "@/types";

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
