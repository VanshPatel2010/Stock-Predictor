"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchForecast,
  fetchHistory,
  fetchPrediction,
  fetchPredictionHistory,
  fetchStocks
} from "@/lib/api";
import { useStockStore } from "@/lib/store";
import {
  ForecastPoint,
  HistoricalPredictionPoint,
  Prediction,
  StockSummary
} from "@/types";

import { PredictionCard } from "./PredictionCard";
import NewsSection from "./NewsSection";
import { RealtimeTicker } from "./RealtimeTicker";
import { StockChart } from "./StockChart";
import { WatchlistPanel } from "./WatchlistPanel";

const EMPTY_FORECAST: ForecastPoint[] = [];
const EMPTY_PREDICTION_HISTORY: HistoricalPredictionPoint[] = [];

export function DashboardClient() {
  const [watchlist, setWatchlist] = useState<StockSummary[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [predictionHistory, setPredictionHistory] = useState<HistoricalPredictionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeSymbol = useStockStore((state) => state.activeSymbol);
  const priceMap = useStockStore((state) => state.prices);
  const predictionMap = useStockStore((state) => state.prediction);
  const setActiveSymbol = useStockStore((state) => state.setActiveSymbol);
  const setPrices = useStockStore((state) => state.setPrices);
  const setPrediction = useStockStore((state) => state.setPrediction);

  const prices = priceMap[activeSymbol] ?? [];
  const prediction = predictionMap[activeSymbol] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadWatchlist() {
      try {
        const summaries = await fetchStocks();
        if (cancelled) {
          return;
        }

        setWatchlist(summaries);
        if (summaries[0] && !summaries.some((item) => item.symbol === activeSymbol)) {
          setActiveSymbol(summaries[0].symbol);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load watchlist.");
        }
      }
    }

    loadWatchlist();
    return () => {
      cancelled = true;
    };
  }, [activeSymbol, setActiveSymbol]);

  useEffect(() => {
    let cancelled = false;

    async function loadSymbolData() {
      setLoading(true);
      setError(null);
      setForecast([]);
      setPredictionHistory([]);

      try {
        const [history, nextPrediction, nextForecast, previousPredictions] = await Promise.all([
          fetchHistory(activeSymbol, 60),
          fetchPrediction(activeSymbol).catch(() => null as Prediction | null),
          fetchForecast(activeSymbol, 5).catch(() => EMPTY_FORECAST),
          fetchPredictionHistory(activeSymbol, 30).catch(() => EMPTY_PREDICTION_HISTORY)
        ]);

        if (cancelled) {
          return;
        }

        setPrices(activeSymbol, history);
        setPrediction(activeSymbol, nextPrediction);
        setForecast(nextForecast);
        setPredictionHistory(previousPredictions);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load symbol data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSymbolData();
    return () => {
      cancelled = true;
    };
  }, [activeSymbol, setPrediction, setPrices]);

  const activeSummary = useMemo(
    () => watchlist.find((item) => item.symbol === activeSymbol) ?? null,
    [activeSymbol, watchlist]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.65fr_0.75fr]">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[32px] border border-slate-800/80 bg-slate-950/80 p-5 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Active Market Feed
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                {activeSymbol} {activeSummary ? `· $${activeSummary.latestPrice.toFixed(2)}` : ""}
              </h2>
            </div>
            <RealtimeTicker symbol={activeSymbol} />
          </div>

          <StockChart
            symbol={activeSymbol}
            prices={prices}
            prediction={prediction}
            predictionHistory={predictionHistory}
            forecast={forecast}
            loading={loading}
            error={error}
          />
        </section>

        <aside className="space-y-6">
          <PredictionCard
            symbol={activeSymbol}
            prices={prices}
            prediction={prediction}
            forecast={forecast}
            predictionHistory={predictionHistory}
          />
          <WatchlistPanel
            activeSymbol={activeSymbol}
            items={watchlist}
            onSelect={setActiveSymbol}
          />
        </aside>
      </div>

      <NewsSection symbol={activeSymbol} />
    </div>
  );
}
