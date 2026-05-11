"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type StockChartProps = {
  symbol: string;
};

const data = [
  { date: "Mon", close: 186, prediction: 188 },
  { date: "Tue", close: 187, prediction: 188.4 },
  { date: "Wed", close: 189, prediction: 189.1 },
  { date: "Thu", close: 191, prediction: 190.8 },
  { date: "Fri", close: 190, prediction: 192.4 }
];

export function StockChart({ symbol }: StockChartProps) {
  return (
    <article className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
            Price vs Prediction
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">{symbol}</h2>
        </div>
      </div>

      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="closeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="date" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#0f766e"
              fill="url(#closeGradient)"
              strokeWidth={3}
            />
            <Area
              type="monotone"
              dataKey="prediction"
              stroke="#f97316"
              fillOpacity={0}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

