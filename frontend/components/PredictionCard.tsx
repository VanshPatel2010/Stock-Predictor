import { Prediction } from "@/types";

type PredictionCardProps = {
  prediction: Prediction;
};

export function PredictionCard({ prediction }: PredictionCardProps) {
  return (
    <article className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
            Next Session Forecast
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">
            {prediction.symbol}
          </h2>
        </div>
        <span className="rounded-full bg-tide/10 px-3 py-1 text-sm font-semibold text-tide">
          {(prediction.confidence * 100).toFixed(0)}% confidence
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric label="Predicted Close" value={`$${prediction.predictedClose.toFixed(2)}`} />
        <Metric label="Lower Bound" value={`$${prediction.lowerBound.toFixed(2)}`} />
        <Metric label="Upper Bound" value={`$${prediction.upperBound.toFixed(2)}`} />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-100/80 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

