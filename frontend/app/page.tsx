import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <div className="mb-8 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-amber-300/90">
            Realtime Forecast Terminal
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
                Watch live candles, model forecasts, and Supabase-driven updates in one trading dashboard.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                Historical OHLCV flows in from FastAPI, prediction intervals come from the offline
                LSTM, and realtime inserts redraw the active chart without a refresh.
              </p>
            </div>
          </div>
        </div>

        {/* Client dashboard mounts live data, prediction fetches, and realtime subscriptions. */}
        <DashboardClient />
      </section>
    </main>
  );
}
