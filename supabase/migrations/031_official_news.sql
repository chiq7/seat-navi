-- 031: Official NEWS storage and public projection.
--
-- IMPORTANT: this migration is intentionally written for a database where 031 has never been
-- applied. If a previous revision was partially applied, do not rerun this file blindly: inspect
-- the table, policies, functions, trigger, and grants, then reconcile or roll back the partial
-- objects before applying the final migration.

-- This is the SQL counterpart of scripts/officialNews/urlIdentity.mjs. Query strings and fragments
-- are preserved because some official sites use them as article identifiers. Only surrounding
-- whitespace, the case of the scheme/authority, and one terminal slash are normalized.
create function public.normalize_official_news_url(input_url text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select regexp_replace(
    case
      when btrim(input_url) ~* '^https?://[^/?#]+'
        then lower(substring(btrim(input_url) from '(?i)^(https?://[^/?#]+)'))
          || coalesce(substring(btrim(input_url) from '(?i)^https?://[^/?#]+(.*)$'), '')
      else btrim(input_url)
    end,
    '/$',
    ''
  );
$$;

create table public.official_news (
  id                     uuid        primary key default gen_random_uuid(),
  artist_slug            text        not null check (btrim(artist_slug) <> ''),
  article_title          text        not null check (btrim(article_title) <> ''),
  article_url            text        not null check (btrim(article_url) <> ''),
  normalized_article_url text        generated always as
    (public.normalize_official_news_url(article_url)) stored,
  published_date         date,
  article_body           text,
  thumbnail_url          text,
  category               text
                           check (category in ('live', 'ticket', 'release', 'media', 'goods', 'fanclub', 'other')),
  is_event_candidate     boolean,
  event_name             text,
  tour_name              text,
  -- A date without a year remains in its original representation, so these stay text/text[].
  event_dates            text[]      not null default '{}',
  venue_names            text[]      not null default '{}',
  ticket_sale_start      text,
  ticket_sale_end        text,
  confidence             text        check (confidence in ('high', 'medium', 'low')),
  needs_review           boolean     not null default true,
  review_reason          text,
  fetched_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint official_news_artist_normalized_url_key
    unique (artist_slug, normalized_article_url)
);

create index official_news_artist_slug_idx
  on public.official_news (artist_slug);
create index official_news_published_date_idx
  on public.official_news (published_date desc);
create index official_news_category_idx
  on public.official_news (category);

create function public.set_official_news_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger official_news_set_updated_at
before update on public.official_news
for each row execute function public.set_official_news_updated_at();

alter table public.official_news enable row level security;

-- There is deliberately no anon/authenticated policy on the base table. The table owner and the
-- service_role can access it; the crawler uses service_role for SELECT/upsert.
revoke all on table public.official_news from public, anon, authenticated;
grant select, insert, update, delete on table public.official_news to service_role;

-- This owner-rights view is the only public read surface. Its projection is the security boundary:
-- article_body and normalized_article_url are not exposed. security_barrier prevents predicate
-- pushdown from being used to infer hidden values.
create view public.official_news_public
with (security_barrier = true, security_invoker = false)
as
select
  id,
  artist_slug,
  article_title,
  article_url,
  published_date,
  thumbnail_url,
  category,
  is_event_candidate,
  event_name,
  tour_name,
  event_dates,
  venue_names,
  ticket_sale_start,
  ticket_sale_end,
  confidence,
  needs_review,
  review_reason,
  fetched_at,
  created_at
from public.official_news;

revoke all on table public.official_news_public from public, anon, authenticated;
grant select on table public.official_news_public to anon, authenticated;

-- These functions are implementation details, not public RPCs.
revoke all on function public.normalize_official_news_url(text) from public, anon, authenticated;
revoke all on function public.set_official_news_updated_at() from public, anon, authenticated;
grant execute on function public.normalize_official_news_url(text) to service_role;
grant execute on function public.set_official_news_updated_at() to service_role;
