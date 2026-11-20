import { ARTISTS } from "@/lib/artists";
import { SEARCH_VENUE_CATALOG } from "@/data/searchVenueCatalog";
import { getArtistSearchNames, getVenueSearchNames } from "@/lib/searchQuery";
import { SEARCH_REGIONS, SEARCH_CONTENT_INTENTS } from "@/lib/searchDiscovery";
import { normalizeForSearch } from "@/lib/keywordMatch";

export type SearchSpellingEntity = { kind: "artist" | "venue" | "region" | "intent" | "site"; id: string; title: string; names: string[]; href?: string };
function names(values: readonly string[]) { return [...new Set(values.map(normalizeForSearch).filter(Boolean))]; }
/** Search-only identities: never used to assign crawler records or to create SEO pages. */
export const SEARCH_SPELLING_ENTITIES: readonly SearchSpellingEntity[] = [
  { kind: "site", id: "site", title: "ちけレポ トップ", names: names(["ちけレポ", "TixRepo", "chikerepo", "tikerepo", "tixrepo.com"]), href: "/" },
  ...ARTISTS.filter(artist => artist.slug !== "test").map(artist => ({
    kind: "artist" as const, id: artist.slug, title: artist.name, names: names(getArtistSearchNames(artist)), href: "/artists/" + artist.slug,
  })),
  ...SEARCH_VENUE_CATALOG.map(venue => ({
    kind: "venue" as const, id: venue.id, title: venue.name, names: names(getVenueSearchNames(venue)),
    href: venue.guideId ? "/venues/" + venue.guideId : undefined,
  })),
  ...SEARCH_REGIONS.map(region => ({ kind: "region" as const, id: region.id, title: region.label, names: names(region.aliases) })),
  ...SEARCH_CONTENT_INTENTS.map(intent => ({
    kind: "intent" as const, id: intent.id, title: intent.id === "seat" ? "座席表" : intent.id === "view" ? "見え方" : intent.id === "luggage" ? "ロッカー" : intent.terms[0],
    names: names(intent.terms),
  })),
];
