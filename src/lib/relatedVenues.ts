import { VENUES } from "./eventCrawlerConfig";
import { getPublicVenueName, getPublicVenueSeatGuideHref } from "./publicVenueGuides";
import { VENUE_REGION_GROUPS } from "./venueRegions";

// Approximate venue scale for navigation only. A concert's capacity depends on its layout.
// Makuhari uses several distinct halls and is matched by area only.
const capacityBands: readonly (readonly string[])[] = [
  ["tokyo-dome", "kyocera-dome", "sapporo-dome", "vantelin-dome", "paypay-dome", "belluna-dome", "zozo-marine", "koshien", "mufg-stadium", "nissan-stadium", "saitama-super-arena"],
  ["k-arena", "yokohama-arena", "osaka-jo-hall", "ariake-arena", "budokan", "yoyogi", "marine-messe", "pia-arena-mm"],
  ["gaishi-hall", "miyagi-arena", "hiroshima-arena", "toki-messe", "edion-arena", "tokyo-garden-theater"],
];

export function getRelatedSeatGuides(venueId: string) {
  const area = VENUE_REGION_GROUPS.find(group => group.venueIds.some(id => id === venueId));
  const scale = capacityBands.find(ids => ids.includes(venueId));
  if (!area && !scale) return [];

  return VENUES.flatMap(venue => {
    if (venue.id === venueId) return [];
    const sameArea = area?.venueIds.some(id => id === venue.id) ?? false;
    const similarSize = scale?.includes(venue.id) ?? false;
    if (!sameArea && !similarSize) return [];
    const href = getPublicVenueSeatGuideHref(venue.id);
    if (!href) return [];
    return [{ id: venue.id, name: getPublicVenueName(venue.id, venue.name), href, sameArea, similarSize }];
  }).sort((left, right) => Number(right.sameArea) - Number(left.sameArea) || Number(right.similarSize) - Number(left.similarSize)).slice(0, 4);
}
