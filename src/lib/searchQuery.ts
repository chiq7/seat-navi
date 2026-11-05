import { ARTISTS, type Artist } from "@/lib/artists";
import { ARTIST_SEARCH_ALIASES } from "@/lib/artistSearchAliases";
import { VENUES } from "@/lib/eventCrawlerConfig";
import { VENUE_SEARCH_ALIASES } from "@/lib/venueSearchAliases";
import { normalizeForSearch } from "@/lib/keywordMatch";
import { getPublicVenueName } from "@/lib/publicVenueGuides";

/** Search intent is shared by the query catalogue and the site search. */
export const SEAT_SEARCH_TERMS = ["席", "座席", "座席表", "シートマップ", "見え方"] as const;
const INTENT_WORDS = [
  ...SEAT_SEARCH_TERMS, "せき", "ざせき", "ざせきひょう", "席からの見え方",
  "ライブ", "コンサート", "公演", "会場", "キャパ", "収容人数", "当落", "当選率",
  "アリーナ予想", "座席予想", "現地レポ", "アリーナ",
].map(normalizeForSearch).sort((a, b) => b.length - a.length);

export function getArtistSearchNames(artist: Artist): string[] {
  return [...new Set([artist.name, ...artist.keywords, ...(ARTIST_SEARCH_ALIASES[artist.slug] ?? []), artist.slug])];
}

export function getVenueSearchNames(venue: { id: string; name: string }): string[] {
  return [...new Set([venue.name, getPublicVenueName(venue.id, venue.name), ...(VENUE_SEARCH_ALIASES[venue.id] ?? [])])];
}

type NameEntry = { kind: "artist" | "venue"; id: string; name: string };
const NAMES: NameEntry[] = [
  ...ARTISTS.filter((artist) => artist.slug !== "test").flatMap((artist) =>
    getArtistSearchNames(artist).map((name) => ({ kind: "artist" as const, id: artist.slug, name: normalizeForSearch(name) }))),
  ...VENUES.flatMap((venue) => getVenueSearchNames(venue).map((name) =>
    ({ kind: "venue" as const, id: venue.id, name: normalizeForSearch(name) }))),
].filter((entry) => entry.name.length >= 1).sort((a, b) => b.name.length - a.name.length);

export type SearchQuery = { artistSlugs: string[]; venueIds: string[]; remainder: string[] };

/**
 * Recognize complete names before removing intent words. Longest names win, so
 * "Kアリーナ" survives and "back number" is not split. Keep separator positions
 * for Latin word boundaries: IVE in "IVE LIVE" is valid; IVE in "LIVE" is not.
 * Aliases are for user search only; they never affect crawler attribution.
 */
export function parseSearchQuery(query: string): SearchQuery {
  let compact = "";
  const boundaries = new Set<number>([0]);
  for (const char of query.normalize("NFKC")) {
    const normalized = normalizeForSearch(char);
    if (!normalized) boundaries.add(compact.length);
    compact += normalized;
  }
  boundaries.add(compact.length);
  const occupied = Array.from({ length: compact.length }, () => false);
  const artists = new Set<string>();
  const venues = new Set<string>();
  // A complete artist + venue pair may join two Latin/digit edges without a
  // space (Number_iKアリーナ, 乃木坂46ZOZOマリン). Only a known opposite entity
  // can supply that boundary; arbitrary suffixes such as LIVE still cannot.
  const adjacentName = (entry: NameEntry, at: number, before: boolean) => NAMES.some((other) => {
    if (other.kind === entry.kind) return false;
    const start = before ? at - other.name.length : at;
    const end = start + other.name.length;
    if (start < 0 || compact.slice(start, end) !== other.name) return false;
    if (/^[a-z0-9]/.test(other.name) && /[a-z0-9]/.test(compact[start - 1] ?? "") && !boundaries.has(start) && start !== at) return false;
    if (/[a-z0-9]$/.test(other.name) && /[a-z0-9]/.test(compact[end] ?? "") && !boundaries.has(end) && end !== at) return false;
    return true;
  });
  for (const entry of NAMES) {
    let from = 0;
    while (from < compact.length) {
      const start = compact.indexOf(entry.name, from);
      if (start < 0) break;
      const end = start + entry.name.length;
      from = end;
      if (occupied.slice(start, end).some(Boolean)) continue;
      const latinStart = /^[a-z0-9]/.test(entry.name);
      const latinEnd = /[a-z0-9]$/.test(entry.name);
      if (latinStart && /[a-z0-9]/.test(compact[start - 1] ?? "") && !boundaries.has(start) && !adjacentName(entry, start, true)) continue;
      if (latinEnd && /[a-z0-9]/.test(compact[end] ?? "") && !boundaries.has(end) && !adjacentName(entry, end, false)) continue;
      // Short Japanese names are also ordinary word fragments (あの → あの日).
      // Allow a name next to an already recognized venue or a seat-intent word,
      // but do not reinterpret an unknown title as an artist-only constraint.
      if (entry.kind === "artist" && entry.name.length <= 3 && !latinStart && !latinEnd) {
        const startsCleanly = boundaries.has(start) || occupied[start - 1];
        let tailEnd = end;
        while (tailEnd < compact.length && !boundaries.has(tailEnd) && !occupied[tailEnd]) tailEnd++;
        let tail = compact.slice(end, tailEnd).replace(/^の/, "");
        while (tail) {
          const word = INTENT_WORDS.find((intent) => tail.startsWith(intent));
          if (!word) break;
          tail = tail.slice(word.length).replace(/^の/, "");
        }
        const endsCleanly = boundaries.has(end) || occupied[end] || tail.length === 0;
        if (!startsCleanly || !endsCleanly) continue;
      }
      (entry.kind === "artist" ? artists : venues).add(entry.id);
      occupied.fill(true, start, end);
    }
  }
  const remaining = compact.split("").map((char, index) => occupied[index] ? " " : `${boundaries.has(index) ? " " : ""}${char}`).join("");
  // Intent words may be attached to a name, but may not be removed from the
  // middle of an unknown title. Preserve unknown words for AND filtering.
  const stripIntent = (text: string): string => {
    let value = text;
    let previous;
    do {
      previous = value;
      for (const word of INTENT_WORDS) {
        if (value === word || value === `の${word}`) value = "";
        else if (value.endsWith(word)) value = value.slice(0, -word.length).replace(/の$/, "");
      }
    } while (value !== previous);
    return value === "の" ? "" : value;
  };
  return {
    artistSlugs: [...artists], venueIds: [...venues],
    remainder: [...new Set(remaining.split(/\s+/).map(stripIntent).filter(Boolean))],
  };
}
