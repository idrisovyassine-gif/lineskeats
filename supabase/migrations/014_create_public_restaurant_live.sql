create table if not exists public.public_restaurant_live (
  restaurant_id integer primary key
    references public.restaurants(id)
    on delete cascade,
  name text not null,
  description text,
  image text,
  address text,
  latitude double precision,
  longitude double precision,
  wait_time_minutes integer not null default 15 check (wait_time_minutes >= 0 and wait_time_minutes <= 120),
  is_active boolean not null default true,
  accepts_online_payment boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.public_restaurant_live enable row level security;

drop policy if exists "Public restaurant live is readable" on public.public_restaurant_live;
create policy "Public restaurant live is readable" on public.public_restaurant_live
  for select using (true);

create index if not exists idx_public_restaurant_live_active
  on public.public_restaurant_live(is_active);

create or replace function public.sync_public_restaurant_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_restaurant_live
    where restaurant_id = old.id;

    return old;
  end if;

  insert into public.public_restaurant_live (
    restaurant_id,
    name,
    description,
    image,
    address,
    latitude,
    longitude,
    wait_time_minutes,
    is_active,
    accepts_online_payment,
    updated_at
  )
  values (
    new.id,
    new.name,
    new.description,
    new.image,
    new.address,
    new.latitude,
    new.longitude,
    new.wait_time_minutes,
    new.is_active,
    (
      new.stripe_account_id is not null
      and new.stripe_charges_enabled = true
      and new.stripe_payouts_enabled = true
      and new.stripe_onboarding_completed = true
    ),
    now()
  )
  on conflict (restaurant_id) do update
  set
    name = excluded.name,
    description = excluded.description,
    image = excluded.image,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    wait_time_minutes = excluded.wait_time_minutes,
    is_active = excluded.is_active,
    accepts_online_payment = excluded.accepts_online_payment,
    updated_at = excluded.updated_at;

  return new;
end
$$;

drop trigger if exists sync_public_restaurant_live_on_restaurants on public.restaurants;
create trigger sync_public_restaurant_live_on_restaurants
after insert or update or delete on public.restaurants
for each row execute function public.sync_public_restaurant_live();

insert into public.public_restaurant_live (
  restaurant_id,
  name,
  description,
  image,
  address,
  latitude,
  longitude,
  wait_time_minutes,
  is_active,
  accepts_online_payment,
  updated_at
)
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
  ),
  now()
from public.restaurants r
on conflict (restaurant_id) do update
set
  name = excluded.name,
  description = excluded.description,
  image = excluded.image,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  wait_time_minutes = excluded.wait_time_minutes,
  is_active = excluded.is_active,
  accepts_online_payment = excluded.accepts_online_payment,
  updated_at = excluded.updated_at;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'public_restaurant_live'
  ) then
    alter publication supabase_realtime add table public.public_restaurant_live;
  end if;
end
$$;
