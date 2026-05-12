"use client";

import { useMemo } from "react";

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  ForecastPoint,
  HistoricalPredictionPoint,
  Prediction,
  StockPricePoint
} from "@/types";

type ChartRow = {
  symbol?: string;
  timestamp?: string;
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  historical_predicted_close?: number;
  historical_confidence_low?: number;
  historical_confidence_high?: number;
  predicted_close?: number;
  confidence_low?: number;
  confidence_high?: number;
  isForecast?: boolean;
  isBullish?: boolean;
  candleBody?: number;
  candleBase?: number;
  wickLow?: number;
  wickHigh?: number;
};

type StockChartProps = {
  symbol: string;
  prices: StockPricePoint[];
  prediction: Prediction | null;
  predictionHistory: HistoricalPredictionPoint[];
  forecast: ForecastPoint[];
  loading: boolean;
  error: string | null;
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-2 text-xs text-gray-100">
      <p className="mb-1 font-semibold">{formatDate(label)}</p>
      {point.isForecast ? (
        <>
          <p className="text-amber-400">
            Predicted: ${point.predicted_close?.toFixed(2) ?? "--"}
          </p>
          <p className="text-gray-400">
            Range: ${point.confidence_low?.toFixed(2) ?? "--"} - $
            {point.confidence_high?.toFixed(2) ?? "--"}
          </p>
        </>
      ) : (
        <>
          <p>Open: ${point.open?.toFixed(2) ?? "--"}</p>
          <p>Close: ${point.close?.toFixed(2) ?? "--"}</p>
          <p>High: ${point.high?.toFixed(2) ?? "--"}</p>
          <p>Low: ${point.low?.toFixed(2) ?? "--"}</p>
          {point.historical_predicted_close !== undefined ? (
            <p className="text-sky-300">
              Saved prediction: ${point.historical_predicted_close.toFixed(2)}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export function StockChart({
  symbol,
  prices,
  prediction,
  predictionHistory,
  forecast,
  loading,
  error
}: StockChartProps) {
  const chartData = useMemo<ChartRow[]>(() => {
    const historicalPredictionByDate = new Map(
      predictionHistory.map((point) => [point.date, point] as const)
    );

    const historical: ChartRow[] = prices.map((point) => {
      const bullish = point.close >= point.open;
      const historyPoint = historicalPredictionByDate.get(point.timestamp.slice(0, 10));
      return {
        ...point,
        date: point.timestamp.slice(0, 10),
        historical_predicted_close: historyPoint?.predicted_close,
        historical_confidence_low: historyPoint?.confidence_low,
        historical_confidence_high: historyPoint?.confidence_high,
        isBullish: bullish,
        candleBody: Math.max(Math.abs(point.close - point.open), 0.05),
        candleBase: Math.min(point.open, point.close),
        wickLow: point.low,
        wickHigh: point.high - point.low
      };
    });

    if (historical.length > 0 && forecast.length > 0) {
      historical[historical.length - 1] = {
        ...historical[historical.length - 1],
        predicted_close: historical[historical.length - 1].close
      };
    }

    const futureRows = forecast.map((point) => ({
      date: point.date,
      predicted_close: point.predicted_close,
      confidence_low: point.confidence_low,
      confidence_high: point.confidence_high,
      isForecast: true
    }));

    return [...historical, ...futureRows];
  }, [forecast, predictionHistory, prices]);

  return (
    <article className="rounded-[34px] border border-slate-800 bg-slate-950/85 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
            OHLCV + Forecast Envelope
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-50">{symbol}</h2>
        </div>
        <div className="text-sm text-slate-400">
          {loading ? "Loading history..." : `${prices.length} historical rows loaded`}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="h-[460px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 12, bottom: 18, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="4 8" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={{ stroke: "#334155" }}
              minTickGap={26}
            />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={{ stroke: "#334155" }}
              width={72}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              dataKey="confidence_high"
              stroke="none"
              fill="#f59e0b"
              fillOpacity={0.12}
              connectNulls
              legendType="none"
              dot={false}
              activeDot={false}
            />
            <Area
              dataKey="confidence_low"
              stroke="none"
              fill="#020617"
              fillOpacity={1}
              connectNulls
              legendType="none"
              dot={false}
              activeDot={false}
            />
            <Bar dataKey="wickLow" stackId="wick" fill="transparent" isAnimationActive={false} />
            <Bar
              dataKey="wickHigh"
              stackId="wick"
              fill="#94a3b8"
              opacity={0.9}
              barSize={2}
              radius={[8, 8, 8, 8]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="candleBase"
              stackId="candle"
              fill="transparent"
              isAnimationActive={false}
            />
            <Bar
              dataKey="candleBody"
              stackId="candle"
              barSize={8}
              radius={[4, 4, 4, 4]}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`${entry.date}-${index}`}
                  fill={entry.isBullish ? "#22c55e" : "#ef4444"}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="historical_predicted_close"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
              name="Saved Predictions"
            />
            <Line
              type="monotone"
              dataKey="predicted_close"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
              connectNulls
              name="Predicted Close"
              dot={({ cx, cy, payload }) => {
                if (payload?.isForecast && typeof cx === "number" && typeof cy === "number") {
                  return <circle cx={cx} cy={cy} r={3} fill="#f59e0b" />;
                }
                return <g />;
              }}
            />
            {prediction ? (
              <ReferenceLine
                y={prediction.predictedClose}
                stroke="#fbbf24"
                strokeDasharray="5 5"
                strokeOpacity={0.45}
                label={{
                  value: `Next Close $${prediction.predictedClose.toFixed(2)}`,
                  fill: "#fbbf24",
                  position: "insideTopRight",
                  fontSize: 11
                }}
              />
            ) : null}
            {forecast.length > 0 ? (
              <ReferenceLine
                x={forecast[0].date}
                stroke="#6b7280"
                strokeDasharray="4 4"
                label={{
                  value: "Forecast →",
                  position: "insideTopLeft",
                  fill: "#9ca3af",
                  fontSize: 11
                }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
