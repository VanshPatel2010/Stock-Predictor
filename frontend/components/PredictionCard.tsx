import { Prediction, StockPricePoint } from "@/types";

type PredictionCardProps = {
  symbol: string;
  prices: StockPricePoint[];
  prediction: Prediction | null;
};

export function PredictionCard({
  symbol,
  prices,
  prediction
}: PredictionCardProps) {
  const lastClose = prices.at(-1)?.close ?? 0;
  const projectedMove = prediction ? prediction.predictedClose - lastClose : 0;
  const isUp = projectedMove >= 0;
  const mae =
    prediction != null
      ? Math.max(
          Math.abs(prediction.confidenceHigh - prediction.confidenceLow) / 3,
          0.01
        )
      : null;

  return (
    <article className="rounded-[30px] border border-slate-800 bg-slate-950/85 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
            Next Session Forecast
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-50">{symbol}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            isUp ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {isUp ? "↑ Bullish" : "↓ Bearish"}
        </span>
      </div>

      <div className="mt-6 rounded-3xl border border-amber-400/15 bg-amber-400/5 p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">Prediction Line</p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-semibold text-slate-50">
              {prediction ? `$${prediction.predictedClose.toFixed(2)}` : "--"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              For{" "}
              {prediction
                ? new Date(prediction.predictedForDate).toLocaleDateString()
                : "next trading session"}
            </p>
          </div>
          <p className={`text-sm font-semibold ${isUp ? "text-emerald-300" : "text-rose-300"}`}>
            {prediction ? `${isUp ? "+" : ""}${projectedMove.toFixed(2)} vs last close` : "Waiting for forecast"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Metric
          label="Confidence Low"
          value={prediction ? `$${prediction.confidenceLow.toFixed(2)}` : "--"}
        />
        <Metric
          label="Confidence High"
          value={prediction ? `$${prediction.confidenceHigh.toFixed(2)}` : "--"}
        />
        <Metric label="Last Close" value={lastClose ? `$${lastClose.toFixed(2)}` : "--"} />
        <Metric label="Model MAE" value={mae !== null ? `$${mae.toFixed(2)}` : "--"} />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}
