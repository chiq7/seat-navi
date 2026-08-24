import "server-only";
import { unstable_cache } from "next/cache";
import { queryEventsForArtist } from "@/lib/events";
import { queryEventWithArtist, type EventOgInfo } from "@/lib/og/eventOgData";
import { isTestEvent } from "@/lib/seoData";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { CrawledEvent } from "@/lib/types";
import { findDisplayedEventRepresentative } from "@/lib/eventDisplay";

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
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      return client ? queryEventsForArtist(client, artistSlug) : [];
    },
    ["public-artist-events", artistSlug],
    { revalidate: PUBLIC_EVENT_TTL_SECONDS, tags: [`artist-events:${artistSlug}`] },
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
      const { data } = await query.limit(30);
      const rows = (data as CrawledEvent[]) ?? [];
      return findDisplayedEventRepresentative(rows, event)?.id ?? event.id;
    },
    ["canonical-event", event.id],
    { revalidate: PUBLIC_EVENT_TTL_SECONDS, tags: [`event:${event.id}`] },
  )();
}
