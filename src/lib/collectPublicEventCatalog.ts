import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENT_COLUMNS } from "./og/eventOgData";
import { getJstDateString } from "./artistPageData";
import { getReviewedTicketUpdates, getUpcomingHomeEvents, isVagueHomeVenue, type HomeFeedItem } from "./homeData";
import { resolveArtist } from "./artists";
import { createPublicDataSnapshot } from "./publicDataSnapshot";
import { readSupabasePages } from "./supabase/readPages";
import { publicPageDataPaths, type HomePrograms, type PublicFeed } from "./publicPageData";
import { isTestEvent } from "./seoData";
import { PUBLIC_CATALOG_MAX_BYTES, readPublicEventCatalog } from "./publicEventCatalog";
import type { CrawledEvent } from "./types";

export async function collectPublicEventCatalog(client: SupabaseClient, signal: AbortSignal) {
  // All reads use the anonymous RLS role. A partial read never replaces the previous snapshot.
  const rows = await readSupabasePages<CrawledEvent & { created_at: string | null }>((from, to) =>
    client.from("events").select(`${EVENT_COLUMNS}, created_at`, { count: "exact" }).order("id").range(from, to).abortSignal(signal),
  );
  if (rows.error || rows.limited || rows.data.some(row => !row.id || !row.title || typeof row.venue !== "string")) {
    throw new Error("Public catalog read did not finish");
  }
  const published = rows.data.filter(event => !isTestEvent(event));
  if (!published.length) throw new Error("Public catalog unexpectedly contained no events");
  const events = published.map(({ created_at: _createdAt, ...event }) => event);

  const now = new Date();
  const today = getJstDateString(now);
  const [upcoming, reviewed] = await Promise.all([getUpcomingHomeEvents(client, true), getReviewedTicketUpdates(client, now, true)]);
  signal.throwIfAborted();
  const updatedAt = now.toISOString();
  const home = createPublicDataSnapshot(publicPageDataPaths.upcoming, { events: upcoming.filter(event => event.dateIso && event.dateIso >= today) }, updatedAt).data as HomePrograms;
  const recent = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const additions = published.flatMap((event): HomeFeedItem[] => {
    if (!event.date || event.date < today || !event.created_at || Date.parse(event.created_at) < Date.parse(recent)
      || isVagueHomeVenue(event.venue)) return [];
    const artist = resolveArtist(event);
    if (!artist) return [];
    return [{
      id: `catalog-event-${event.id}`, type: "公演情報", detail: "公演ページが追加されました",
      artistName: artist.name, venue: event.venue, date: event.date, createdAt: event.created_at,
      href: `/events/${encodeURIComponent(event.id)}`, xHandle: null, source: "editorial",
    }];
  });
  const ids = new Set(events.map(event => event.id));
  const items = [...reviewed, ...additions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20);
  const feed = (createPublicDataSnapshot(publicPageDataPaths.feed, items, updatedAt).data as PublicFeed).filter(item => {
    const eventId = item.href.match(/^\/events\/([^#?]+)(?:[#?]|$)/)?.[1];
    return !eventId || ids.has(eventId);
  });
  const catalog = readPublicEventCatalog({ version: 1, updatedAt, events, home, feed });
  const json = JSON.stringify(catalog);
  if (new TextEncoder().encode(json).byteLength > PUBLIC_CATALOG_MAX_BYTES) throw new Error("Public catalog exceeds the storage limit");
  return { catalog, json };
}
