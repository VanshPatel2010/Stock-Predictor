import {
  ForecastPoint,
  HistoricalPredictionPoint,
  Prediction,
  StockPricePoint
} from "@/types";

type PredictionCardProps = {
  symbol: string;
  prices: StockPricePoint[];
  prediction: Prediction | null;
  forecast: ForecastPoint[];
  predictionHistory: HistoricalPredictionPoint[];
};

function formatForecastDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function PredictionCard({
  symbol,
  prices,
  prediction,
  forecast,
  predictionHistory
}: PredictionCardProps) {
  const lastClose = prices.at(-1)?.close ?? null;
  const projectedMove =
    prediction && lastClose !== null ? prediction.predictedClose - lastClose : null;
  const isUp = projectedMove !== null ? projectedMove >= 0 : true;
  const actualCloseByDate = new Map(prices.map((point) => [point.timestamp.slice(0, 10), point.close]));

  return (
    <article className="rounded-[30px] border border-slate-800 bg-slate-950/85 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-4 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
              Next Session Prediction
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-50">
              {prediction ? `$${prediction.predictedClose.toFixed(2)}` : "--"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {prediction
                ? new Date(`${prediction.predictedForDate}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })
                : "Waiting for prediction"}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                isUp ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
              }`}
            >
              {isUp ? "↑ Bullish" : "↓ Bearish"}
            </span>
            <p className="mt-3 text-sm text-slate-400">
              {projectedMove !== null
                ? `${projectedMove >= 0 ? "+" : ""}${projectedMove.toFixed(2)} vs last close`
                : "No comparison available"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-300">
          5-Day Forecast · {symbol}
        </h3>
        {forecast.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700 text-gray-500">
                <th className="pb-1 text-left">Date</th>
                <th className="pb-1 text-right">Predicted</th>
                <th className="pb-1 text-right">Low</th>
                <th className="pb-1 text-right">High</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((point, index) => (
                <tr
                  key={point.date}
                  className={index % 2 === 0 ? "bg-gray-800/40" : undefined}
                >
                  <td className="py-1 text-gray-300">{formatForecastDate(point.date)}</td>
                  <td className="py-1 text-right font-mono text-amber-400">
                    ${point.predicted_close.toFixed(2)}
                  </td>
                  <td className="py-1 text-right font-mono text-red-400">
                    ${point.confidence_low.toFixed(2)}
                  </td>
                  <td className="py-1 text-right font-mono text-green-400">
                    ${point.confidence_high.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-slate-400">
            Forecast unavailable right now. Historical pricing will continue to render.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-sky-900/60 bg-slate-950 p-4">
        <h3 className="mb-3 text-sm font-semibold text-sky-200">
          Saved Daily Prediction History
        </h3>
        {predictionHistory.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="pb-1 text-left">Date</th>
                <th className="pb-1 text-right">Predicted</th>
                <th className="pb-1 text-right">Actual</th>
                <th className="pb-1 text-right">Error</th>
              </tr>
            </thead>
            <tbody>
              {predictionHistory.slice(-5).reverse().map((point, index) => {
                const actualClose = actualCloseByDate.get(point.date);
                const error =
                  actualClose !== undefined ? Math.abs(point.predicted_close - actualClose) : null;

                return (
                  <tr
                    key={`${point.date}-${point.forecast_day}`}
                    className={index % 2 === 0 ? "bg-slate-900/60" : undefined}
                  >
                    <td className="py-1 text-slate-300">{formatForecastDate(point.date)}</td>
                    <td className="py-1 text-right font-mono text-sky-300">
                      ${point.predicted_close.toFixed(2)}
                    </td>
                    <td className="py-1 text-right font-mono text-slate-300">
                      {actualClose !== undefined ? `$${actualClose.toFixed(2)}` : "--"}
                    </td>
                    <td className="py-1 text-right font-mono text-slate-400">
                      {error !== null ? `$${error.toFixed(2)}` : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-slate-400">
            No saved day-1 prediction history is available yet.
          </p>
        )}
      </div>
    </article>
  );
}
