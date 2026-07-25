drop policy if exists "public read approved fan seat predictions"
  on public.fan_seat_predictions;

drop policy if exists "authenticated read own fan seat predictions"
  on public.fan_seat_predictions;

create policy "anon read approved fan seat predictions"
  on public.fan_seat_predictions
  for select
  to anon
  using (approved = true);

create policy "authenticated read visible fan seat predictions"
  on public.fan_seat_predictions
  for select
  to authenticated
  using (approved = true or (select auth.uid()) = user_id);
