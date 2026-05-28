create table if not exists fan_seat_predictions (
  id text primary key,
  event_id text not null,
  image_path text not null,
  comment text,
  prediction_tags text[] not null default '{}',
  display_name text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),

  constraint fk_fan_seat_predictions_event
    foreign key (event_id)
    references public.events (id)
    on delete cascade
);

create index if not exists fan_seat_predictions_event_id_idx
  on fan_seat_predictions (event_id);

create index if not exists fan_seat_predictions_approved_event_id_idx
  on fan_seat_predictions (approved, event_id);

alter table fan_seat_predictions enable row level security;

create policy "public read approved fan seat predictions"
  on fan_seat_predictions
  for select
  using (approved = true);
