create policy "authenticated select own fan seat prediction images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fan-seat-predictions'
    and owner_id = (select auth.uid()::text)
  );
