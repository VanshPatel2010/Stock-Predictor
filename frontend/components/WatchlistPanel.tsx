import { StockSummary } from "@/types";

type WatchlistPanelProps = {
  activeSymbol: string;
  items: StockSummary[];
  onSelect: (symbol: string) => void;
};

export function WatchlistPanel({
  activeSymbol,
  items,
  onSelect
}: WatchlistPanelProps) {
  return (
    <section className="rounded-[30px] border border-slate-800 bg-slate-950/85 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-5">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
          Watchlist
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-50">Tracked symbols</h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isActive = item.symbol === activeSymbol;
          const positive = item.percentChange >= 0;

          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onSelect(item.symbol)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                isActive
                  ? "border-amber-400/40 bg-amber-400/10"
                  : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div>
                <p className="text-lg font-semibold text-slate-50">{item.symbol}</p>
                <p className="mt-1 text-sm text-slate-400">
                  ${item.latestPrice.toFixed(2)}
                </p>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  positive ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                }`}
              >
                {positive ? "+" : ""}
                {item.percentChange.toFixed(2)}%
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
