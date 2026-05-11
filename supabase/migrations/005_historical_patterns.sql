-- 同会場の過去公演座席実績テーブル
create table if not exists historical_patterns (
  id                text        primary key,
  venue             text        not null,
  event_name        text        not null,
  artist            text        not null,
  block             text        not null,
  max_row           int,
  max_seat          int,
  upgrade_blocks    text,
  image_url         text,
  image_description text,
  created_at        timestamptz not null default now()
);

create index if not exists historical_patterns_venue_idx  on historical_patterns (venue);
create index if not exists historical_patterns_artist_idx on historical_patterns (artist);

alter table historical_patterns enable row level security;

create policy "public read historical_patterns"
  on historical_patterns for select using (true);
-- INSERT は service_role のみ
