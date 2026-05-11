create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stock_prices'
      and column_name = 'ts'
  ) then
    alter table public.stock_prices rename column ts to timestamp;
  end if;
end $$;

alter table public.stock_prices
  drop constraint if exists stock_prices_symbol_ts_key;

alter table public.stock_prices
  drop constraint if exists stock_prices_symbol_timestamp_key;

alter table public.stock_prices
  add constraint stock_prices_symbol_timestamp_key unique (symbol, timestamp);

drop index if exists public.stock_prices_symbol_ts_idx;

create index if not exists stock_prices_symbol_ts_idx
  on public.stock_prices (symbol, timestamp desc);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'predictions'
      and column_name = 'lower_bound'
  ) then
    alter table public.predictions rename column lower_bound to confidence_low;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'predictions'
      and column_name = 'upper_bound'
  ) then
    alter table public.predictions rename column upper_bound to confidence_high;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'predictions'
      and column_name = 'as_of'
  ) then
    alter table public.predictions rename column as_of to predicted_for_date;
  end if;
end $$;

alter table public.predictions
  drop column if exists confidence;

alter table public.predictions
  alter column predicted_for_date type date
  using predicted_for_date::date;

drop index if exists public.predictions_symbol_as_of_idx;

create index if not exists predictions_symbol_as_of_idx
  on public.predictions (symbol, predicted_for_date desc);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  alert_threshold double precision,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists watchlist_user_id_idx
  on public.watchlist (user_id, symbol);

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
