alter table public.orders
  add column if not exists quoted_wait_time_minutes integer
    check (quoted_wait_time_minutes is null or (quoted_wait_time_minutes >= 0 and quoted_wait_time_minutes <= 120)),
  add column if not exists picked_up_at timestamptz;

create or replace function public.get_public_order_history(order_ids uuid[])
returns table (
  id uuid,
  restaurant_id integer,
  restaurant_name text,
  restaurant_image text,
  items jsonb,
  total numeric,
  status text,
  payment_status text,
  currency text,
  quoted_wait_time_minutes integer,
  created_at timestamptz,
  picked_up_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    o.id,
    o.restaurant_id,
    r.name as restaurant_name,
    r.image as restaurant_image,
    o.items,
    o.total,
    case when o.status = 'delivered' then 'picked_up' else o.status end as status,
    o.payment_status,
    o.currency,
    o.quoted_wait_time_minutes,
    o.created_at,
    o.picked_up_at
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  where o.id = any(coalesce(order_ids, '{}'::uuid[]))
  order by o.created_at desc
$$;

grant execute on function public.get_public_order_history(uuid[]) to anon, authenticated;
