import "server-only";
import { unstable_cache } from "next/cache";
import { resolveArtist } from "@/lib/artists";
import { VENUES, getVenueIdAliases, type VenueConfig } from "@/lib/eventCrawlerConfig";
import { isArtistOnlyEventTitle } from "@/lib/eventTitle";
import { isTestEvent } from "@/lib/seoData";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { dedupeVenueEventsForDisplay } from "@/lib/eventDisplay";
import { getRequestPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import type { CrawledEvent } from "@/lib/types";

export const SEO_VENUES = VENUES.map(({ id, name }) => ({ id, name }));

export function findSeoVenue(id: string): VenueConfig | null {
  return VENUES.find((venue) => venue.id === id || getVenueIdAliases(venue.id).includes(id)) ?? null;
}

export async function readVenueEvents(venueId: string, client = createSupabasePublicClient()): Promise<CrawledEvent[]> {
  const venue = findSeoVenue(venueId);
  if (!venue) return [];

  if (!client) throw new Error("Venue event read unavailable");
  const { data, error } = await client
    .from("events")
    .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
    .in("venue_id", [...getVenueIdAliases(venue.id)])
    .order("date", { ascending: true })
    .limit(300);

  if (error) throw new Error("Venue event read failed");
  const publicEvents = ((data as CrawledEvent[]) ?? []).filter((event) => {
    const artist = resolveArtist(event);
    return !isTestEvent(event) && !isArtistOnlyEventTitle(event.title, artist?.name);
  });
  return dedupeVenueEventsForDisplay(publicEvents);
}

export async function getVenueEvents(venueId: string): Promise<CrawledEvent[]> {
  const venue = findSeoVenue(venueId);
  if (!venue) return [];
  const catalog = await getRequestPublicEventCatalog();
  if (catalog) return catalogVenueEvents(catalog.events, venue.id);
  return unstable_cache(
    () => readVenueEvents(venue.id),
    ["public-venue-events-v3", venue.id],
    { revalidate: 900, tags: [`venue-events:${venue.id}`] },
  )();
}

export function catalogVenueEvents(events: readonly CrawledEvent[], venueId: string) {
  const aliases = getVenueIdAliases(venueId);
  const matches = events.filter(event => aliases.includes(event.venue_id))
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999")).slice(0, 300);
  return dedupeVenueEventsForDisplay(matches);
}
