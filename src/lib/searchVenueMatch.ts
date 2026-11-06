import { SEARCH_VENUE_CATALOG, type SearchVenueCatalogEntry } from "@/data/searchVenueCatalog";
import { getVenueIdAliases } from "@/lib/eventCrawlerConfig";
import { normalizeForSearch } from "@/lib/keywordMatch";
import type { CrawledEvent } from "@/lib/types";

const names = new Map<string, string[]>(SEARCH_VENUE_CATALOG.map(venue => [venue.id,
  Array.from(new Set([venue.name, ...venue.eventVenueNames, ...venue.aliases].map(normalizeForSearch)))]));
const hallQualifiers = ["国際展示場", "展示場", "展示ホール", "イベントホール"].map(normalizeForSearch);

/** Actual public records win. A parent hall also matches explicit festival lists,
 * but 東京ドーム never becomes 東京ドームシティホール through a prefix match. */
export function eventMatchesSearchVenue(event: Pick<CrawledEvent, "id" | "venue" | "venue_id">, venue: SearchVenueCatalogEntry): boolean {
  if (venue.eventIds.includes(event.id)) return true;
  if (venue.guideId && event.venue_id && getVenueIdAliases(venue.guideId).includes(event.venue_id)) return true;
  const parts = [event.venue, ...event.venue.split(/[&＆+＋/／・]/)].map(normalizeForSearch);
  return (names.get(venue.id) ?? []).some(name => parts.some(part => part === name
    || (part.startsWith(name) && hallQualifiers.some(qualifier => part.slice(name.length).startsWith(qualifier)))));
}
