"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useStockStore } from "@/lib/store";
import { StockPricePoint } from "@/types";

type RealtimeTickerProps = {
  symbol: string;
};

export function RealtimeTicker({ symbol }: RealtimeTickerProps) {
  const appendPrice = useStockStore((state) => state.appendPrice);
  const [status, setStatus] = useState("Connecting to market feed");

  useEffect(() => {
    const channel = supabase
      .channel("stock_prices")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stock_prices"
        },
        (payload) => {
          const nextPrice = payload.new as StockPricePoint;
          appendPrice({
            ...nextPrice,
            symbol: nextPrice.symbol.toUpperCase()
          });

          if (nextPrice.symbol.toUpperCase() === symbol.toUpperCase()) {
            setStatus(`Streaming ${symbol.toUpperCase()} updates`);
          }
        }
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          setStatus(`Subscribed to ${symbol.toUpperCase()} channel`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appendPrice, symbol]);

  return (
    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 shadow-lg shadow-emerald-950/10">
      {status}
    </div>
  );
}
