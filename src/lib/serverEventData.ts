import "server-only";
import { unstable_cache } from "next/cache";
import { catalogEventsForArtist, queryEventsForArtist } from "@/lib/events";
import { getRequestPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import { queryEventWithArtist, type EventOgInfo } from "@/lib/og/eventOgData";
import { isTestEvent } from "@/lib/seoData";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { CrawledEvent } from "@/lib/types";
import { findDisplayedEventRepresentative, getSamePerformanceEventIds } from "@/lib/eventDisplay";

export const PUBLIC_EVENT_TTL_SECONDS = 3600;

export async function getCachedPublicEvent(eventId: string): Promise<EventOgInfo | null> {
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) return null;
      const info = await queryEventWithArtist(client, eventId);
      if (!info || isTestEvent(info.event)) return null;
      return { ...info, isTestData: isTestEvent(info.event) };
    },
    ["public-event", eventId],
    { revalidate: PUBLIC_EVENT_TTL_SECONDS, tags: [`event:${eventId}`] },
  )();
}

export async function getCachedArtistEvents(artistSlug: string): Promise<CrawledEvent[]> {
  const catalog = await getRequestPublicEventCatalog();
  if (catalog) return catalogEventsForArtist(catalog.events, artistSlug);
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) throw new Error("Public artist events reader is unavailable");
      return queryEventsForArtist(client, artistSlug, { throwOnError: true });
    },
    ["public-artist-events", artistSlug],
    { revalidate: 900, tags: [`artist-events:${artistSlug}`] },
  )();
}

/** 同日・同会場・同一公演回の安全な表示代表をcanonicalに使う。DB行やURLは変更しない。 */
export async function getCachedCanonicalEventId(info: EventOgInfo): Promise<string> {
  const event = info.event;
  if (!event.date) return event.id;

  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) return event.id;
      let query = client
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .eq("date", event.date as string);
      query = event.venue_id
        ? query.eq("venue_id", event.venue_id)
        : query.eq("venue", event.venue);
      const { data, error } = await query.limit(30);
      if (error) throw new Error("Canonical event lookup failed", { cause: error });
      // 公開ページ・sitemapと同じ対象に限定し、非公開行の404へcanonicalを向けない。
      const rows = ((data as CrawledEvent[]) ?? []).filter((candidate) => !isTestEvent(candidate));
      return findDisplayedEventRepresentative(rows, event)?.id ?? event.id;
    },
    ["canonical-event", event.id],
    { revalidate: PUBLIC_EVENT_TTL_SECONDS, tags: [`event:${event.id}`] },
  )();
}

/** The visible representative must retain reports saved against its same-show aliases. */
export async function getCachedSamePerformanceEventIds(info: EventOgInfo): Promise<string[]> {
  const event = info.event;
  if (!event.date) return [event.id];
  return unstable_cache(async () => {
    const client = createSupabasePublicClient();
    if (!client) return [event.id];
    let query = client.from("events").select("id, title, venue, venue_id, date, artist_slug").eq("date", event.date as string);
    query = event.venue_id ? query.eq("venue_id", event.venue_id) : query.eq("venue", event.venue);
    const { data, error } = await query.limit(100);
    if (error) throw new Error("Same-performance event lookup failed", { cause: error });
    return getSamePerformanceEventIds(((data as CrawledEvent[]) ?? []).filter(row => !isTestEvent(row)), event);
  }, ["same-performance-event-ids", event.id], { revalidate: PUBLIC_EVENT_TTL_SECONDS, tags: [`event:${event.id}`] })();
}
