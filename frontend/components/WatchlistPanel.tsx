type WatchlistItem = {
  symbol: string;
  price: number;
  delta: number;
};

type WatchlistPanelProps = {
  items: WatchlistItem[];
};

export function WatchlistPanel({ items }: WatchlistPanelProps) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
          Watchlist
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">
          Core market movers
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.symbol}
            className="rounded-2xl bg-slate-100/90 p-4 transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-ink">{item.symbol}</span>
              <span
                className={`text-sm font-semibold ${
                  item.delta >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {item.delta >= 0 ? "+" : ""}
                {item.delta.toFixed(2)}%
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-slate-900">
              ${item.price.toFixed(2)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

