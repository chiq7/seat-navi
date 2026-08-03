-- Artist fan board. All public traffic goes through the Next.js server route.
-- Browser roles intentionally receive no table or storage write access.

create table public.fan_board_posts (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null check (artist_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  parent_id uuid references public.fan_board_posts (id) on delete cascade,
  display_name text not null default '匿名ファン'
    check (char_length(display_name) between 1 and 24),
  body text not null check (char_length(body) between 1 and 500),
  photo_paths text[] not null default '{}'
    check (cardinality(photo_paths) <= 2),
  rate_limit_hash text not null check (char_length(rate_limit_hash) = 64),
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);

create index fan_board_posts_artist_created_idx
  on public.fan_board_posts (artist_slug, created_at desc)
  where status = 'visible';
create index fan_board_posts_parent_created_idx
  on public.fan_board_posts (parent_id, created_at asc)
  where status = 'visible';
create index fan_board_posts_rate_limit_idx
  on public.fan_board_posts (rate_limit_hash, created_at desc);

alter table public.fan_board_posts enable row level security;
revoke all on table public.fan_board_posts from anon, authenticated;
grant select, insert, update, delete on table public.fan_board_posts to service_role;
create policy "deny browser access to fan board posts"
  on public.fan_board_posts for all
  to anon, authenticated
  using (false)
  with check (false);

create table public.fan_board_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.fan_board_posts (id) on delete cascade,
  reporter_hash text not null check (char_length(reporter_hash) = 64),
  reason text not null check (reason in ('spam', 'harassment', 'spoiler', 'unsafe', 'other')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_hash)
);

create index fan_board_reports_post_created_idx
  on public.fan_board_reports (post_id, created_at desc);
create index fan_board_reports_reporter_created_idx
  on public.fan_board_reports (reporter_hash, created_at desc);

alter table public.fan_board_reports enable row level security;
revoke all on table public.fan_board_reports from anon, authenticated;
grant select, insert, update, delete on table public.fan_board_reports to service_role;
create policy "deny browser access to fan board reports"
  on public.fan_board_reports for all
  to anon, authenticated
  using (false)
  with check (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fan-board-photos',
  'fan-board-photos',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policy is created: only service_role can upload, sign, or remove.
