import { getJstDateString } from "@/lib/artistPageData";
import { getRealtimeFeedItems, getUpcomingHomeEvents } from "@/lib/homeData";
import { selectSeatDiscoveryHomeEvents } from "@/lib/homeSeatSelection";
import { publicPageDataPaths, publicPageRefreshSeconds, type HomePrograms, type PublicFeed, type VenuePrograms } from "@/lib/publicPageData";
import { loadHomeSeatDiscovery } from "@/lib/serverSeatDiscovery";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { PublicEventCatalog } from "@/lib/publicEventCatalog";
import { catalogVenueEvents, findSeoVenue, readVenueEvents } from "@/lib/venueSeo";

async function loadHomePrograms(signal: AbortSignal): Promise<HomePrograms> {
  const client = createSupabasePublicClient(signal);
  if (!client) throw new Error("Public data client is unavailable");
  const today = getJstDateString();
  const events = (await getUpcomingHomeEvents(client, true)).filter(event => event.dateIso && event.dateIso >= today);
  const discoveryCards = await loadHomeSeatDiscovery(selectSeatDiscoveryHomeEvents(events, new Set(), 4, today), client);
  signal.throwIfAborted();
  return { events, discoveryCards };
}

async function loadFeed(signal: AbortSignal): Promise<PublicFeed> {
  const client = createSupabasePublicClient(signal);
  if (!client) throw new Error("Public data client is unavailable");
  return getRealtimeFeedItems(client, 20, undefined, true);
}

async function loadVenuePrograms(venueId: string, signal: AbortSignal): Promise<VenuePrograms> {
  return { events: await readVenueEvents(venueId, createSupabasePublicClient(signal)), today: getJstDateString() };
}

export function publicPageDataRoute(path: string) {
  if (path === publicPageDataPaths.feed) return { seconds: publicPageRefreshSeconds.feed, load: loadFeed };
  if (path === publicPageDataPaths.upcoming) return { seconds: publicPageRefreshSeconds.upcoming, load: loadHomePrograms };
  if (!path.startsWith(publicPageDataPaths.venue)) return null;
  const venueId = path.slice(publicPageDataPaths.venue.length);
  if (findSeoVenue(venueId)?.id !== venueId) return null;
  return {
    seconds: publicPageRefreshSeconds.venue,
    load: (signal: AbortSignal) => loadVenuePrograms(venueId, signal),
    fromCatalog: (catalog: PublicEventCatalog): VenuePrograms => ({
      events: catalogVenueEvents(catalog.events, venueId), today: getJstDateString(),
      activity: catalog.venueActivity?.[venueId],
    }),
  };
}
