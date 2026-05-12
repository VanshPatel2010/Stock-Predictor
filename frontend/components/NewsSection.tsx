"use client";

import { useEffect, useState } from "react";

import { fetchStockNews, NewsArticle, StockNews } from "@/lib/api";

function SentimentBadge({
  overall
}: {
  overall: "bullish" | "bearish" | "neutral";
}) {
  const styles = {
    bullish: "border border-emerald-700 bg-emerald-950/70 text-emerald-300",
    bearish: "border border-rose-700 bg-rose-950/70 text-rose-300",
    neutral: "border border-slate-600 bg-slate-800 text-slate-300"
  } as const;

  const labels = {
    bullish: "Bullish",
    bearish: "Bearish",
    neutral: "Neutral"
  } as const;

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[overall]}`}>
      {labels[overall]}
    </span>
  );
}

function SentimentBar({
  bullish,
  bearish
}: {
  bullish: number;
  bearish: number;
}) {
  const bullishPercent = Math.max(0, Math.min(100, Math.round(bullish * 100)));
  const bearishPercent = Math.max(0, Math.min(100, Math.round(bearish * 100)));

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-emerald-300">Bullish {bullishPercent}%</span>
        <span className="font-medium text-rose-300">Bearish {bearishPercent}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${bullishPercent}%` }}
        />
        <div
          className="bg-rose-500 transition-all duration-500"
          style={{ width: `${bearishPercent}%` }}
        />
      </div>
    </div>
  );
}

function formatPublishedAt(value: string) {
  if (!value) {
    return "";
  }

  return new Date(`${value}Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ArticleCard({ article }: { article: NewsArticle }) {
  const [imageVisible, setImageVisible] = useState(Boolean(article.image));

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/85 p-4 shadow-lg shadow-black/10 transition-all duration-150 hover:border-slate-600 hover:bg-slate-900"
    >
      {article.image && imageVisible ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image}
          alt=""
          className="h-20 w-20 flex-shrink-0 rounded-xl bg-slate-800 object-cover"
          onError={() => setImageVisible(false)}
        />
      ) : (
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-2xl text-slate-600">
          N
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-sm font-semibold leading-snug text-slate-100 transition-colors group-hover:text-white">
          {article.headline}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {article.summary || "No summary available."}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-400">{article.source || "Unknown source"}</span>
          <span>•</span>
          <span>{formatPublishedAt(article.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

function NewsSkeletonCard() {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/85 p-4 animate-pulse">
      <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-slate-800" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-full rounded bg-slate-800" />
        <div className="h-4 w-4/5 rounded bg-slate-800" />
        <div className="mt-2 h-3 w-full rounded bg-slate-900" />
        <div className="h-3 w-3/4 rounded bg-slate-900" />
        <div className="mt-auto h-3 w-2/5 rounded bg-slate-900" />
      </div>
    </div>
  );
}

export default function NewsSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<StockNews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setData(null);

    fetchStockNews(symbol)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load news.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <section className="rounded-[32px] border border-slate-800 bg-slate-950/75 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Market News
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-50">{symbol}</h2>
        </div>
        {data ? (
          <span className="text-xs uppercase tracking-[0.25em] text-slate-500">
            {data.sentiment.articles_this_week} articles this week
          </span>
        ) : null}
      </div>

      {data ? (
        <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-300">Sentiment Overview</p>
            <SentimentBadge overall={data.sentiment.overall} />
          </div>
          <SentimentBar
            bullish={data.sentiment.bullish_percent}
            bearish={data.sentiment.bearish_percent}
          />
          <p className="mt-3 text-xs text-slate-500">
            Buzz score: {(data.sentiment.buzz_score * 100).toFixed(0)} / 100
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <NewsSkeletonCard key={item} />
          ))}
        </div>
      ) : null}

      {error && !loading ? (
        <div className="rounded-2xl border border-rose-900 bg-rose-950/30 p-4 text-sm text-rose-300">
          Could not load news: {error}
        </div>
      ) : null}

      {data && !loading ? (
        data.articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.articles.map((article, index) => (
              <ArticleCard key={`${article.url}-${index}`} article={article} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/80 py-8 text-center text-sm text-slate-500">
            No news found for {symbol} in the last 7 days.
          </p>
        )
      ) : null}
    </section>
  );
}
