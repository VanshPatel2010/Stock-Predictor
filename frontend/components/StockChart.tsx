"use client";

import {
  Area,
  Bar,
  Brush,
  Cell,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { ChartPoint, Prediction, StockPricePoint } from "@/types";

type StockChartProps = {
  symbol: string;
  prices: StockPricePoint[];
  prediction: Prediction | null;
  loading: boolean;
  error: string | null;
};

function buildChartData(
  prices: StockPricePoint[],
  prediction: Prediction | null
): ChartPoint[] {
  return prices.map((point) => {
    const bullish = point.close >= point.open;
    return {
      ...point,
      predictedClose: prediction?.predictedClose,
      predictedHigh: prediction?.confidenceHigh,
      predictedLow: prediction?.confidenceLow,
      isBullish: bullish,
      candleBody: Math.max(Math.abs(point.close - point.open), 0.05),
      candleBase: Math.min(point.open, point.close),
      wickLow: point.low,
      wickHigh: point.high - point.low
    };
  });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

export function StockChart({
  symbol,
  prices,
  prediction,
  loading,
  error
}: StockChartProps) {
  const chartData = buildChartData(prices, prediction);

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
          {loading ? "Loading history..." : `${chartData.length} rows loaded`}
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
            <defs>
              <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="4 8" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
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
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #1e293b",
                borderRadius: "16px",
                color: "#e2e8f0"
              }}
              labelFormatter={(value) => formatTimestamp(String(value))}
            />
            <Area
              type="monotone"
              dataKey="predictedHigh"
              stroke="none"
              fill="url(#bandFill)"
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="predictedLow"
              stroke="none"
              fill="#020617"
              fillOpacity={1}
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
              {chartData.map((entry) => (
                <Cell
                  key={`${entry.symbol}-${entry.timestamp}`}
                  fill={entry.isBullish ? "#22c55e" : "#ef4444"}
                />
              ))}
            </Bar>
            {prediction ? (
              <ReferenceLine
                y={prediction.predictedClose}
                stroke="#f59e0b"
                strokeDasharray="6 6"
                label={{
                  value: "Predicted Close",
                  fill: "#fbbf24",
                  position: "insideTopRight"
                }}
              />
            ) : null}
            <Brush
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              height={26}
              stroke="#f59e0b"
              travellerWidth={12}
              fill="#111827"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
