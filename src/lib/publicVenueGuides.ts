import { SAPPORO_DISPLAY_NAME, SAPPORO_OFFICIAL_NAME } from "./venuePageDisplayNames";
import { VENUES, getVenueIdAliases } from "./eventCrawlerConfig";
import { normalizeForMatch } from "./keywordMatch";

// Public routes are explicit: adding research or a preview does not publish a guide.
export const PUBLIC_ARENA_GUIDE_IDS = [
  "yokohama-arena", "osaka-jo-hall", "pia-arena-mm", "tokyo-garden-theater",
  "saitama-super-arena", "ariake-arena", "budokan", "yoyogi",
  "gaishi-hall", "marine-messe", "vantelin-dome",
  "paypay-dome", "sapporo-dome", "belluna-dome", "zozo-marine", "koshien",
  "mufg-stadium", "nissan-stadium", "makuhari-messe", "edion-arena",
  "miyagi-arena", "hiroshima-arena", "toki-messe",
] as const;

export type PublicArenaGuideId = typeof PUBLIC_ARENA_GUIDE_IDS[number];

export const PUBLIC_VENUE_GUIDE_IDS: readonly string[] = [
  "tokyo-dome", "kyocera-dome", "k-arena", ...PUBLIC_ARENA_GUIDE_IDS,
];

// Date for the approved 26-venue publication. Live status is confirmed by the deployment receipt.
export const PUBLIC_VENUE_GUIDE_UPDATED_AT = "2026-10-12";

export function getPublicVenueGuideUpdatedAt(id: string): string | undefined {
  return hasPublicVenueGuide(id) ? PUBLIC_VENUE_GUIDE_UPDATED_AT : undefined;
}

export function isPublicArenaGuideVenue(id: string): id is PublicArenaGuideId {
  return (PUBLIC_ARENA_GUIDE_IDS as readonly string[]).includes(id);
}

export function hasPublicVenueGuide(id: string): boolean {
  return PUBLIC_VENUE_GUIDE_IDS.includes(id);
}

// Official event feeds also use the current name or the venue's English name.
// These are complete facility names, separate from the broader search aliases.
const EVENT_VENUE_NAMES: Readonly<Record<string, readonly string[]>> = {
  "gaishi-hall": ["クロコくんホール", "日本ガイシホール"],
  "kyocera-dome": ["KYOCERA DOME OSAKA"],
  "sapporo-dome": [SAPPORO_OFFICIAL_NAME, "プレミストドーム", `${SAPPORO_OFFICIAL_NAME}（札幌ドーム）`],
};

export function getPublicVenueGuideId(id: string | null | undefined, name?: string | null): string | null {
  const canonicalId = id && PUBLIC_VENUE_GUIDE_IDS.find(venueId => getVenueIdAliases(venueId).includes(id));
  if (canonicalId) return canonicalId;
  if (!name?.trim()) return null;
  const normalized = normalizeForMatch(name).replace(/\s+/g, " ");
  const matches = VENUES.filter(venue => PUBLIC_VENUE_GUIDE_IDS.includes(venue.id)
    && [venue.name, getPublicVenueName(venue.id, venue.name), ...(EVENT_VENUE_NAMES[venue.id] ?? [])]
      .some(value => normalizeForMatch(value).replace(/\s+/g, " ") === normalized));
  // No partial matches: another hall, a city, or multiple venues stay unresolved.
  return matches.length === 1 ? matches[0].id : null;
}

export function getPublicVenueSeatGuideHref(id: string | null | undefined, name?: string | null): string | null {
  const canonicalId = getPublicVenueGuideId(id, name);
  return canonicalId ? `/venues/${encodeURIComponent(canonicalId)}#venue-seat-guide` : null;
}

export function getPublicVenueName(id: string, fallback: string): string {
  if (id === "gaishi-hall") return "クロコくんホール（旧日本ガイシホール）";
  if (id === "marine-messe") return "マリンメッセ福岡A館";
  if (id === "paypay-dome") return "みずほPayPayドーム福岡";
  if (id === "sapporo-dome") return SAPPORO_DISPLAY_NAME;
  if (id === "mufg-stadium") return "MUFGスタジアム（国立競技場）";
  if (id === "edion-arena") return "エディオンアリーナ大阪";
  return fallback;
}

// Keep the source name in storage, and use the same Sapporo label on public event links.
// PayPay Dome is shown under its current name (みずほPayPayドーム福岡) everywhere, like the venue page.
export function getEventDisplayVenueName(id: string | null | undefined, name: string): string {
  if (id === "sapporo-dome") return SAPPORO_DISPLAY_NAME;
  if (id === "paypay-dome") return getPublicVenueName("paypay-dome", name);
  if (/PayPayドーム|ペイペイドーム|福岡ドーム/i.test(name) && getPublicVenueGuideId(id, name) === "paypay-dome") return getPublicVenueName("paypay-dome", name);
  if (!/札幌ドーム|プレミストドーム/.test(name)) return name;
  return getPublicVenueGuideId(id, name) === "sapporo-dome" ? SAPPORO_DISPLAY_NAME : name;
}
