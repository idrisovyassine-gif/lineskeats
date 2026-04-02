-- Ajout des champs de localisation et délai d'attente pour les restaurants
alter table public.restaurants 
add column if not exists address text,
add column if not exists latitude numeric(10, 8),
add column if not exists longitude numeric(11, 8),
add column if not exists wait_time_minutes integer default 15,
add column if not exists is_active boolean default true;

-- Ajout d'une contrainte pour s'assurer que la latitude et longitude sont valides si fournies
alter table public.restaurants 
add constraint restaurants_lat_check check (latitude is null or (latitude >= -90 and latitude <= 90)),
add constraint restaurants_lng_check check (longitude is null or (longitude >= -180 and longitude <= 180));

-- Ajout d'une contrainte pour le délai d'attente positif
alter table public.restaurants 
add constraint restaurants_wait_time_check check (wait_time_minutes >= 0 and wait_time_minutes <= 120);
