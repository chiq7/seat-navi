import { findArtistBySlug, resolveUniqueArtistMatch } from "./artists";
import { getJstDateString } from "./artistPageData";
import { VENUES, getVenueIdAliases } from "./eventCrawlerConfig";
import { isArtistOnlyEventTitle, parseEventTitle } from "./eventTitle";
import { getPublicVenueName, getPublicVenueSeatGuideHref } from "./publicVenueGuides";
import type { CrawledEvent } from "./types";

export type ArtistSeatGuideVenue = {
  id: string;
  name: string;
  href: string;
  upcoming: CrawledEvent[];
  past: CrawledEvent[];
};

/** 公開済みの会場ガイドと、当該アーティストの実公演だけをつなぐ。 */
export function getArtistSeatGuideVenues(
  slug: string,
  events: readonly CrawledEvent[],
  today = getJstDateString(),
): ArtistSeatGuideVenue[] {
  const artist = findArtistBySlug(slug);
  if (!artist || slug === "test") return [];
  const groups = new Map<string, ArtistSeatGuideVenue>();
  const seen = new Set<string>();

  for (const event of events) {
    if (!event.date || seen.has(event.id)
      || parseEventTitle(event.title, artist.name).isTestData
      || isArtistOnlyEventTitle(event.title, artist.name)) continue;
    const eventArtist = event.artist_slug ?? resolveUniqueArtistMatch(event.title).artist?.slug;
    if (eventArtist !== slug) continue;

    // IDや会場名を推測して別の施設の図へ送らない。
    const venue = VENUES.find((candidate) => event.venue_id && getVenueIdAliases(candidate.id).includes(event.venue_id));
    const href = getPublicVenueSeatGuideHref(venue?.id);
    if (!venue || !href) continue;
    seen.add(event.id);

    let group = groups.get(venue.id);
    if (!group) {
      group = { id: venue.id, name: getPublicVenueName(venue.id, venue.name), href, upcoming: [], past: [] };
      groups.set(venue.id, group);
    }
    (event.date >= today ? group.upcoming : group.past).push(event);
  }

  for (const group of groups.values()) {
    group.upcoming.sort((a, b) => a.date!.localeCompare(b.date!) || a.id.localeCompare(b.id));
    group.past.sort((a, b) => b.date!.localeCompare(a.date!) || a.id.localeCompare(b.id));
  }
  return [...groups.values()].sort((a, b) => {
    if (a.upcoming.length && b.upcoming.length) return a.upcoming[0].date!.localeCompare(b.upcoming[0].date!) || a.id.localeCompare(b.id);
    if (a.upcoming.length || b.upcoming.length) return a.upcoming.length ? -1 : 1;
    return b.past[0].date!.localeCompare(a.past[0].date!) || a.id.localeCompare(b.id);
  });
}
