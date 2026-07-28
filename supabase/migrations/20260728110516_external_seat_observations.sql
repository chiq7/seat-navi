-- 外部の公開座席情報から抽出した「座席位置の派生事実」専用。
-- ユーザー投稿・当選率・件数集計とは完全に分離する。
create table public.external_seat_observations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  source_type text not null check (source_type in ('pia_resale', 'ticketjam', 'ticket_ryutsu', 'official_resale', 'other')),
  source_key text not null check (char_length(source_key) > 0),
  source_url text check (source_url is null or source_url ~ '^https://'),
  ingestion_method text not null check (ingestion_method in ('manual', 'crawler')),
  observed_at timestamptz not null default now(),
  seat_area text not null check (seat_area in ('arena', 'stand', 'unknown')),
  block text,
  row_min integer check (row_min is null or row_min >= 1),
  row_max integer check (row_max is null or row_max >= row_min),
  seat_min integer check (seat_min is null or seat_min >= 1),
  seat_max integer check (seat_max is null or seat_max >= seat_min),
  gate text,
  level text,
  confidence text not null check (confidence in ('exact', 'range', 'candidate')),
  evidence_summary text not null check (char_length(evidence_summary) <= 160),
  review_status text not null default 'approved' check (review_status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  unique (event_id, source_type, source_key)
);

create index external_seat_observations_visible_event_idx
  on public.external_seat_observations (event_id, review_status, seat_area, observed_at desc);

-- 定期取得対象。一般公開はせず、サービスロールだけが読み書きする。
create table public.external_seat_sources (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  source_type text not null check (source_type in ('pia_resale', 'ticketjam', 'ticket_ryutsu', 'official_resale', 'other')),
  source_url text not null check (source_url ~ '^https://'),
  active boolean not null default true,
  last_fetched_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 300),
  created_at timestamptz not null default now(),
  unique (event_id, source_url)
);

create index external_seat_sources_schedule_idx
  on public.external_seat_sources (active, last_fetched_at asc nulls first);

alter table public.external_seat_observations enable row level security;
alter table public.external_seat_sources enable row level security;

-- Data APIへの公開範囲は明示する。外部座席は承認済みアリーナ情報だけ読み取り可。
revoke all on table public.external_seat_observations from anon, authenticated;
grant select on table public.external_seat_observations to anon, authenticated;
grant all on table public.external_seat_observations to service_role;

revoke all on table public.external_seat_sources from anon, authenticated;
grant all on table public.external_seat_sources to service_role;

create policy "公開済みアリーナ外部席情報を閲覧できる"
  on public.external_seat_observations
  for select
  to anon, authenticated
  using (review_status = 'approved' and seat_area = 'arena');
