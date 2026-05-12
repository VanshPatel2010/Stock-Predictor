alter table public.predictions
  add column if not exists forecast_day integer not null default 1;
