alter table public.restaurants
add column if not exists stripe_account_id text,
add column if not exists stripe_charges_enabled boolean not null default false,
add column if not exists stripe_payouts_enabled boolean not null default false,
add column if not exists stripe_onboarding_completed boolean not null default false;

create unique index if not exists idx_restaurants_stripe_account_id
on public.restaurants(stripe_account_id)
where stripe_account_id is not null;

alter table public.orders
add column if not exists customer_email text,
add column if not exists payment_status text not null default 'pending_payment',
add column if not exists stripe_checkout_session_id text,
add column if not exists stripe_payment_intent_id text,
add column if not exists platform_fee_amount numeric(10, 2),
add column if not exists restaurant_amount numeric(10, 2),
add column if not exists currency text not null default 'eur';

alter table public.orders
drop constraint if exists orders_payment_status_check;

alter table public.orders
add constraint orders_payment_status_check
check (payment_status in ('pending_payment', 'paid', 'payment_failed', 'expired', 'refunded', 'canceled'));

create index if not exists idx_orders_payment_status
on public.orders(payment_status);

create unique index if not exists idx_orders_stripe_checkout_session_id
on public.orders(stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create unique index if not exists idx_orders_stripe_payment_intent_id
on public.orders(stripe_payment_intent_id)
where stripe_payment_intent_id is not null;
