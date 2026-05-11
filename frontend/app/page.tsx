import { PredictionCard } from "@/components/PredictionCard";
import { RealtimeTicker } from "@/components/RealtimeTicker";
import { StockChart } from "@/components/StockChart";
import { WatchlistPanel } from "@/components/WatchlistPanel";

const samplePrediction = {
  symbol: "AAPL",
  predictedClose: 192.44,
  lowerBound: 189.8,
  upperBound: 195.1,
  confidence: 0.84,
  asOf: new Date().toISOString()
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-tide">
              Realtime Market Intelligence
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink md:text-6xl">
              Follow live price action and next-day LSTM predictions in one dashboard.
            </h1>
          </div>
          <RealtimeTicker symbol="AAPL" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <StockChart symbol="AAPL" />
          <PredictionCard prediction={samplePrediction} />
        </div>

        <WatchlistPanel
          items={[
            { symbol: "AAPL", price: 191.32, delta: 1.14 },
            { symbol: "MSFT", price: 421.18, delta: 0.57 },
            { symbol: "NVDA", price: 917.26, delta: -1.21 }
          ]}
        />
      </section>
    </main>
  );
}

