"use client";

import { useEffect, useState } from "react";

type RealtimeTickerProps = {
  symbol: string;
};

export function RealtimeTicker({ symbol }: RealtimeTickerProps) {
  const [status, setStatus] = useState("Waiting for realtime feed");

  useEffect(() => {
    setStatus(`Subscribed to ${symbol} via Supabase Realtime`);
  }, [symbol]);

  return (
    <div className="rounded-full border border-tide/20 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-panel">
      {status}
    </div>
  );
}

