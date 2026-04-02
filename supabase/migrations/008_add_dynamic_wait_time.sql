-- Table pour suivre l'occupation du restaurant en temps réel
create table if not exists public.restaurant_occupancy (
  id uuid primary key default gen_random_uuid(),
  restaurant_id bigint references public.restaurants(id) on delete cascade,
  current_occupancy integer not null default 0 check (current_occupancy >= 0),
  estimated_wait_time integer check (estimated_wait_time >= 0 and estimated_wait_time <= 120),
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Ajout d'une colonne pour le mode de calcul du temps d'attente
alter table public.restaurants 
add column if not exists wait_time_mode text default 'manual' check (wait_time_mode in ('manual', 'dynamic', 'auto'));

-- Ajout des paramètres de calcul dynamique
alter table public.restaurants 
add column if not exists base_wait_time integer default 15 check (base_wait_time >= 5 and base_wait_time <= 60),
add column if not exists max_wait_time integer default 60 check (max_wait_time >= 15 and max_wait_time <= 120),
add column if not exists capacity_threshold integer default 10 check (capacity_threshold >= 1 and capacity_threshold <= 100);

-- Activation du RLS
alter table public.restaurant_occupancy enable row level security;

-- Politiques pour l'occupation (gérée par le propriétaire)
create policy "Restaurant occupancy is manageable by restaurant owner" on public.restaurant_occupancy
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

-- Politiques pour l'occupation (lecture publique pour les clients)
create policy "Restaurant occupancy is public readable" on public.restaurant_occupancy
for select using (true);

-- Index pour optimiser les requêtes
create index if not exists idx_restaurant_occupancy_restaurant_id on public.restaurant_occupancy(restaurant_id);
create index if not exists idx_restaurant_occupancy_last_updated on public.restaurant_occupancy(last_updated);
