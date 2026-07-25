-- Authentication profiles, favourite artists, and ownership for user posts.
-- Existing anonymous posts intentionally keep user_id = null.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  x_handle text check (x_handle is null or x_handle ~ '^[A-Za-z0-9_]{1,15}$'),
  show_x_on_posts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "public read opted-in profiles"
  on public.profiles for select
  to anon, authenticated
  using (show_x_on_posts = true);

create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;

create table public.favorite_artists (
  user_id uuid not null references auth.users (id) on delete cascade,
  artist_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_slug)
);

create index favorite_artists_artist_slug_idx
  on public.favorite_artists (artist_slug);

alter table public.favorite_artists enable row level security;

create policy "users read own favorites"
  on public.favorite_artists for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users insert own favorites"
  on public.favorite_artists for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users delete own favorites"
  on public.favorite_artists for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on table public.favorite_artists to authenticated;

alter table public.event_ticket_results
  add column user_id uuid references auth.users (id) on delete set null;
alter table public.seat_reports
  add column user_id uuid references auth.users (id) on delete set null;
alter table public.after_reports
  add column user_id uuid references auth.users (id) on delete set null;

create index event_ticket_results_user_id_idx on public.event_ticket_results (user_id, created_at desc);
create index seat_reports_user_id_idx on public.seat_reports (user_id, created_at desc);
create index after_reports_user_id_idx on public.after_reports (user_id, created_at desc);

drop policy if exists "anon insert event_ticket_results" on public.event_ticket_results;
drop policy if exists "anon insert seat_reports" on public.seat_reports;
drop policy if exists "anon insert after_reports" on public.after_reports;

create policy "anonymous insert event ticket results"
  on public.event_ticket_results for insert
  to anon
  with check (user_id is null);
create policy "authenticated insert own event ticket results"
  on public.event_ticket_results for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "anonymous insert seat reports"
  on public.seat_reports for insert
  to anon
  with check (user_id is null);
create policy "authenticated insert own seat reports"
  on public.seat_reports for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "anonymous insert after reports"
  on public.after_reports for insert
  to anon
  with check (user_id is null);
create policy "authenticated insert own after reports"
  on public.after_reports for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users update own event ticket results"
  on public.event_ticket_results for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users delete own event ticket results"
  on public.event_ticket_results for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users update own seat reports"
  on public.seat_reports for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users delete own seat reports"
  on public.seat_reports for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users update own after reports"
  on public.after_reports for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "users delete own after reports"
  on public.after_reports for delete
  to authenticated
  using ((select auth.uid()) = user_id);
