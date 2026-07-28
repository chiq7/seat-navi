import { cache } from "react";
import { getJstDateString } from "@/lib/artistPageData";
import { VENUES, getVenueIdAliases, type VenueConfig } from "@/lib/eventCrawlerConfig";
import { isTestEvent } from "@/lib/seoData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CrawledEvent } from "@/lib/types";

export const SEO_VENUES = VENUES.map(({ id, name }) => ({ id, name }));

export function findSeoVenue(id: string): VenueConfig | null {
  return VENUES.find((venue) => venue.id === id || getVenueIdAliases(venue.id).includes(id)) ?? null;
}

export const getVenueEvents = cache(async (venueId: string): Promise<CrawledEvent[]> => {
  const venue = findSeoVenue(venueId);
  if (!venue) return [];

  const client = await createSupabaseServerClient();
  if (!client) return [];
  const { data } = await client
    .from("events")
    .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
    .in("venue_id", [...getVenueIdAliases(venue.id)])
    .order("date", { ascending: true })
    .limit(300);

  return ((data as CrawledEvent[]) ?? []).filter((event) => !isTestEvent(event));
});

export function splitVenueEvents(events: readonly CrawledEvent[]) {
  const today = getJstDateString();
  return {
    upcoming: events.filter((event) => event.date && event.date >= today),
    past: events.filter((event) => event.date && event.date < today).reverse(),
  };
}

