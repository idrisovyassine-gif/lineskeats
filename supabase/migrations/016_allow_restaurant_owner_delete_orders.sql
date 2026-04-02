create policy "Orders are deletable by restaurant owner" on public.orders
  for delete using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );
