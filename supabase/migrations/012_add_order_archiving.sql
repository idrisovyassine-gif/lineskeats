alter table public.orders
  add column if not exists archived_at timestamptz;

create index if not exists idx_orders_archived_at
  on public.orders(archived_at);
