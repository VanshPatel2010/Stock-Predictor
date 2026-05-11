create extension if not exists pgcrypto;

create table if not exists public.stock_prices (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  ts timestamptz not null,
  open double precision not null,
  high double precision not null,
  low double precision not null,
  close double precision not null,
  volume bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (symbol, ts)
);

create index if not exists stock_prices_symbol_ts_idx
  on public.stock_prices (symbol, ts desc);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  predicted_close double precision not null,
  lower_bound double precision not null,
  upper_bound double precision not null,
  confidence double precision not null,
  as_of timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists predictions_symbol_as_of_idx
  on public.predictions (symbol, as_of desc);

do $$
begin
  begin
    alter publication supabase_realtime add table public.stock_prices;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.predictions;
  exception
    when duplicate_object then null;
  end;
end $$;
