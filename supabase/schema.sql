create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id integer not null,
  items jsonb not null,
  total numeric(10, 2) not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text not null default 'pending',
  payment_status text not null default 'pending_payment',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  platform_fee_amount numeric(10, 2),
  restaurant_amount numeric(10, 2),
  currency text not null default 'eur',
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.restaurants
  add column if not exists owner_id uuid references auth.users(id);

alter table public.restaurants
  add column if not exists stripe_account_id text,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_onboarding_completed boolean not null default false;

alter table public.restaurants
  add constraint restaurants_owner_unique unique (owner_id);

alter table public.orders
  add constraint orders_restaurant_fk foreign key (restaurant_id)
  references public.restaurants(id)
  on delete cascade;

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('pending_payment', 'paid', 'payment_failed', 'expired', 'refunded', 'canceled'));

alter table public.restaurants enable row level security;
alter table public.orders enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

create policy "Restaurants are viewable by owner" on public.restaurants
  for select using (auth.uid() = owner_id);

create policy "Restaurants are insertable by owner" on public.restaurants
  for insert with check (auth.uid() = owner_id);

create policy "Restaurants are updatable by owner" on public.restaurants
  for update using (auth.uid() = owner_id);

drop policy if exists "Restaurants are public readable" on public.restaurants;

create policy "Orders are viewable by restaurant owner" on public.orders
  for select using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "Orders are updatable by restaurant owner" on public.orders
  for update using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create unique index if not exists idx_restaurants_stripe_account_id
  on public.restaurants(stripe_account_id)
  where stripe_account_id is not null;

create index if not exists idx_orders_payment_status
  on public.orders(payment_status);

create index if not exists idx_orders_archived_at
  on public.orders(archived_at);

create unique index if not exists idx_orders_stripe_checkout_session_id
  on public.orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists idx_orders_stripe_payment_intent_id
  on public.orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create or replace function public.get_public_restaurants()
returns table (
  id integer,
  name text,
  description text,
  image text,
  address text,
  latitude double precision,
  longitude double precision,
  wait_time_minutes integer,
  is_active boolean,
  accepts_online_payment boolean
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.description,
    r.image,
    r.address,
    r.latitude,
    r.longitude,
    r.wait_time_minutes,
    r.is_active,
    (
      r.stripe_account_id is not null
      and r.stripe_charges_enabled = true
      and r.stripe_payouts_enabled = true
      and r.stripe_onboarding_completed = true
    ) as accepts_online_payment
  from public.restaurants r
  where r.is_active = true
  order by r.id desc
$$;

grant execute on function public.get_public_restaurants() to anon, authenticated;

create policy "Categories are public readable" on public.categories
  for select using (true);

create policy "Products are public readable" on public.products
  for select using (true);

create policy "Categories are manageable by restaurant owner" on public.categories
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  )
  with check (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "Products are manageable by restaurant owner" on public.products
  for all using (
    category_id in (
      select c.id from public.categories c
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  )
  with check (
    category_id in (
      select c.id from public.categories c
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  );

create table if not exists public.product_options (
  id bigint generated by default as identity primary key,
  product_id bigint references public.products(id) on delete cascade,
  name text not null,
  required boolean not null default false
);

create table if not exists public.product_option_items (
  id bigint generated by default as identity primary key,
  option_id bigint references public.product_options(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0
);

alter table public.product_options enable row level security;
alter table public.product_option_items enable row level security;

create policy "Product options are public readable" on public.product_options
  for select using (true);

create policy "Product option items are public readable" on public.product_option_items
  for select using (true);

create policy "Product options are manageable by restaurant owner" on public.product_options
  for all using (
    product_id in (
      select p.id from public.products p
      join public.categories c on c.id = p.category_id
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  )
  with check (
    product_id in (
      select p.id from public.products p
      join public.categories c on c.id = p.category_id
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  );

create policy "Product option items are manageable by restaurant owner" on public.product_option_items
  for all using (
    option_id in (
      select o.id from public.product_options o
      join public.products p on p.id = o.product_id
      join public.categories c on c.id = p.category_id
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  )
  with check (
    option_id in (
      select o.id from public.product_options o
      join public.products p on p.id = o.product_id
      join public.categories c on c.id = p.category_id
      join public.restaurants r on r.id = c.restaurant_id
      where r.owner_id = auth.uid()
    )
  );
