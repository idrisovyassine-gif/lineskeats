drop policy if exists "Restaurant cuisine types are public readable"
on public.restaurant_cuisine_types;

create policy "Restaurant cuisine types are public readable"
on public.restaurant_cuisine_types
for select using (true);
