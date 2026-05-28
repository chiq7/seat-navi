drop policy if exists "anon insert pending fan seat predictions"
  on fan_seat_predictions;

create policy "anon insert public fan seat predictions"
  on fan_seat_predictions
  for insert
  to anon
  with check (approved = true);
