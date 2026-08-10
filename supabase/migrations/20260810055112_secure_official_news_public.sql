-- Make the public NEWS view obey the caller's permissions and RLS policies.
--
-- The base table remains service-role managed. Anonymous and signed-in clients receive
-- SELECT only on the columns already exposed by official_news_public; article_body,
-- normalized_article_url, and updated_at remain inaccessible.

drop policy if exists official_news_public_read on public.official_news;

create policy official_news_public_read
on public.official_news
for select
to anon, authenticated
using (true);

grant select (
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
) on public.official_news to anon, authenticated;

revoke select (
  normalized_article_url,
  article_body,
  updated_at
) on public.official_news from public, anon, authenticated;

alter view public.official_news_public
set (security_invoker = true);
