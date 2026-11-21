-- "この席の写真がほしい": viewers ask for a seat-view photo of one block of a venue.
-- One row per visitor and block. The table is closed to clients; the two functions below
-- are the only way in (add one request, read the counts per block).
--
-- Roll back:
--   drop function if exists public.seat_photo_request_add(text, text, text);
--   drop function if exists public.seat_photo_request_counts(text);
--   drop table if exists public.seat_photo_requests;

create table if not exists public.seat_photo_requests (
  id bigint generated always as identity primary key,
  venue_id text not null check (venue_id ~ '^[a-z0-9-]{1,64}$'),
  section text not null check (section ~ '^[A-Z][0-9]{1,3}$'),
  -- Random key kept in the visitor's browser; it is not an account and names nobody.
  voter_key text not null check (voter_key ~ '^[A-Za-z0-9]{16,64}$'),
  -- Hash of the caller's address and the day, used only to cap requests per day.
  day_hash text,
  created_at timestamptz not null default now(),
  unique (venue_id, section, voter_key)
);
create index if not exists seat_photo_requests_venue_section on public.seat_photo_requests (venue_id, section);
create index if not exists seat_photo_requests_day_hash on public.seat_photo_requests (day_hash, created_at);
create index if not exists seat_photo_requests_voter on public.seat_photo_requests (voter_key, created_at);

alter table public.seat_photo_requests enable row level security;
revoke all on public.seat_photo_requests from anon, authenticated;

create or replace function public.seat_photo_request_counts(p_venue text)
returns table (section text, requests bigint)
language sql stable security definer set search_path = public
as $$
  select r.section, count(*) from public.seat_photo_requests r where r.venue_id = p_venue group by r.section;
$$;

-- Adds the caller's request (a repeat is a no-op) and returns how many visitors now wait for that block.
create or replace function public.seat_photo_request_add(p_venue text, p_section text, p_voter text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_address text := coalesce(nullif(v_headers ->> 'cf-connecting-ip', ''), nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), ''));
  v_day_hash text := case when v_address is null then null
    else encode(sha256(convert_to(v_address || '|' || current_date::text || '|seat-photo-request-v1', 'UTF8')), 'hex') end;
begin
  -- Venues are opened one at a time, as their seat maps gain the button.
  if p_venue is distinct from 'tokyo-dome' or p_section !~ '^[A-Z][0-9]{1,3}$' or p_voter !~ '^[A-Za-z0-9]{16,64}$' then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  if (select count(*) from public.seat_photo_requests where voter_key = p_voter and created_at > now() - interval '1 day') >= 30
    or (v_day_hash is not null and (select count(*) from public.seat_photo_requests where day_hash = v_day_hash and created_at > now() - interval '1 day') >= 60) then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.seat_photo_requests (venue_id, section, voter_key, day_hash)
    values (p_venue, p_section, p_voter, v_day_hash)
    on conflict (venue_id, section, voter_key) do nothing;
  return (select count(*) from public.seat_photo_requests where venue_id = p_venue and section = p_section);
end;
$$;

revoke all on function public.seat_photo_request_counts(text) from public;
revoke all on function public.seat_photo_request_add(text, text, text) from public;
grant execute on function public.seat_photo_request_counts(text) to anon, authenticated;
grant execute on function public.seat_photo_request_add(text, text, text) to anon, authenticated;
