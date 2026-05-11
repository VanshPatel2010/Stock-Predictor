import { Prediction, StockPricePoint } from "@/types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/api";

export async function fetchStocks(symbol?: string): Promise<StockPricePoint[]> {
  const search = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  const response = await fetch(`${apiBaseUrl}/stocks${search}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch stocks.");
  }

  return response.json();
}

export async function fetchPrediction(symbol: string): Promise<Prediction> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/predict/${encodeURIComponent(symbol)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch prediction.");
  }

  return response.json();
}

