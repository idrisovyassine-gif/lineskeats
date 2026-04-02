drop policy if exists "Restaurants are public readable" on public.restaurants;

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
