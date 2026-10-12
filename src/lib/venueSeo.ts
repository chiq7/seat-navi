import "server-only";
import { unstable_cache } from "next/cache";
import { getJstDateString } from "@/lib/artistPageData";
import { resolveArtist } from "@/lib/artists";
import { VENUES, getVenueIdAliases, type VenueConfig } from "@/lib/eventCrawlerConfig";
import { isArtistOnlyEventTitle } from "@/lib/eventTitle";
import { isTestEvent } from "@/lib/seoData";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { dedupeVenueEventsForDisplay } from "@/lib/eventDisplay";
import type { CrawledEvent } from "@/lib/types";

export const SEO_VENUES = VENUES.map(({ id, name }) => ({ id, name }));

export function findSeoVenue(id: string): VenueConfig | null {
  return VENUES.find((venue) => venue.id === id || getVenueIdAliases(venue.id).includes(id)) ?? null;
}

export async function getVenueEvents(venueId: string): Promise<CrawledEvent[]> {
  const venue = findSeoVenue(venueId);
  if (!venue) return [];

  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) return [];
      const { data } = await client
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .in("venue_id", [...getVenueIdAliases(venue.id)])
        .order("date", { ascending: true })
        .limit(300);

      const publicEvents = ((data as CrawledEvent[]) ?? []).filter((event) => {
        const artist = resolveArtist(event);
        return !isTestEvent(event) && !isArtistOnlyEventTitle(event.title, artist?.name);
      });
      return dedupeVenueEventsForDisplay(publicEvents);
    },
    ["public-venue-events-v2", venue.id],
    { revalidate: 3600, tags: [`venue-events:${venue.id}`] },
  )();
}

export function splitVenueEvents(events: readonly CrawledEvent[]) {
  const today = getJstDateString();
  return {
    upcoming: events.filter((event) => event.date && event.date >= today),
    past: events.filter((event) => event.date && event.date < today).reverse(),
  };
}
