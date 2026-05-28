insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fan-seat-predictions',
  'fan-seat-predictions',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "anon upload fan seat prediction images"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'fan-seat-predictions');

create policy "anon insert pending fan seat predictions"
  on fan_seat_predictions
  for insert
  to anon
  with check (approved = false);
