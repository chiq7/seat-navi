create table if not exists fan_seat_prediction_votes (
  id text primary key,
  prediction_id text not null,
  voter_key text not null,
  created_at timestamptz not null default now(),

  constraint fk_fan_seat_prediction_votes_prediction
    foreign key (prediction_id)
    references public.fan_seat_predictions (id)
    on delete cascade,

  constraint fan_seat_prediction_votes_unique_voter
    unique (prediction_id, voter_key)
);

create index if not exists fan_seat_prediction_votes_prediction_id_idx
  on fan_seat_prediction_votes (prediction_id);

alter table fan_seat_prediction_votes enable row level security;

create policy "public read fan seat prediction votes"
  on fan_seat_prediction_votes
  for select
  to anon
  using (true);

create policy "anon insert fan seat prediction votes"
  on fan_seat_prediction_votes
  for insert
  to anon
  with check (true);
