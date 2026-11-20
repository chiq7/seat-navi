import { SEARCH_VENUE_CATALOG, type SearchVenueCatalogEntry } from "@/data/searchVenueCatalog";
import { ARTIST_PUBLIC_ALIASES } from "@/lib/artistSearchAliases";
import { PUBLIC_VENUE_NAMES } from "@/data/publicVenueNames";
import { normalizeForSearch } from "@/lib/keywordMatch";
import type { CrawledEvent } from "@/lib/types";

function additionalNames(names: readonly string[], displayedName: string): string[] {
  // Keep a genuine nickname contained in the formal name and a registered kana
  // reading of a hiragana name. Search's substring/kana folding would drop both.
  const displayKey = (name: string) => name.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const displayed = displayKey(displayedName);
  const seen = new Set<string>();
  return names.filter(name => {
    const normalized = normalizeForSearch(name);
    if (!normalized || displayed === displayKey(name) || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

// Additional public names in Artist.keywords. Those keywords also contain
// crawler shortcuts and related names, so never emit the whole keyword list.
const artistNamesFromKeywords: Readonly<Record<string, readonly string[]>> = {
  nogizaka46: ["乃木坂"], sakurazaka46: ["櫻坂"], hinatazaka46: ["日向坂"],
  arashi: ["ARASHI"], "strawberry-prince": ["Strawberry Prince"], "bullet-train": ["BULLET TRAIN"],
  "doh-kyung-soo-d-o": ["D.O."], ano: ["あの"], chanmina: ["ちゃんみな"],
  zerobaseone: ["ZB1"], "tomorrow-x-together": ["TXT"],
};

export function getPublicArtistAlternateNames(slug: string, name: string): string[] {
  const [reading, ...nicknames] = ARTIST_PUBLIC_ALIASES[slug] ?? [];
  if (!reading) return [];
  return additionalNames([...(artistNamesFromKeywords[slug] ?? []), ...nicknames, reading], name);
}

export function getPublicVenueAlternateNames(id: string, name: string): string[] {
  return additionalNames(PUBLIC_VENUE_NAMES[id] ?? [], name);
}

const venuesByFullName = new Map<string, SearchVenueCatalogEntry[]>();
for (const venue of SEARCH_VENUE_CATALOG) {
  const names = new Set([venue.name, ...venue.eventVenueNames].map(normalizeForSearch));
  for (const name of names) {
    const candidates = venuesByFullName.get(name) ?? [];
    candidates.push(venue);
    venuesByFullName.set(name, candidates);
  }
}

export function getEventVenueForAlternateNames(event: Pick<CrawledEvent, "id" | "venue" | "venue_id">) {
  const matches = venuesByFullName.get(normalizeForSearch(event.venue)) ?? [];
  const booked = matches.filter(venue => venue.eventIds.includes(event.id));
  if (booked.length === 1) return booked[0];
  const byId = matches.filter(venue => event.venue_id && venue.eventVenueIds.includes(event.venue_id));
  if (byId.length === 1) return byId[0];
  if (matches.length === 1 && (!event.venue_id || matches[0].eventVenueIds.length === 0)) return matches[0];
  return null;
}

export function getEventVenueAlternateNames(event: Pick<CrawledEvent, "id" | "venue" | "venue_id">): string[] {
  const venue = getEventVenueForAlternateNames(event);
  if (!venue || venue.guideId || venue.kind !== "venue") return [];
  return additionalNames([venue.name, ...(PUBLIC_VENUE_NAMES[venue.id] ?? [])], event.venue);
}
