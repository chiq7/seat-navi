alter table public.fan_seat_predictions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists fan_seat_predictions_user_id_created_at_idx
  on public.fan_seat_predictions (user_id, created_at desc);

create policy "authenticated insert own fan seat predictions"
  on public.fan_seat_predictions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and approved = true);

create policy "authenticated read own fan seat predictions"
  on public.fan_seat_predictions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated update own fan seat predictions"
  on public.fan_seat_predictions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "authenticated delete own fan seat predictions"
  on public.fan_seat_predictions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated upload own fan seat prediction images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fan-seat-predictions'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "authenticated delete own fan seat prediction images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'fan-seat-predictions'
    and owner_id = (select auth.uid()::text)
  );
