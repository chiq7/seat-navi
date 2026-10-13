import { buildMeta } from "./metadata";
import { venueGuideDescriptions } from "./venueGuideSeoContent";

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

export function getPublicVenueSeatGuideHref(id: string | null | undefined): string | null {
  if (!id || !hasPublicVenueGuide(id)) return null;
  return `/venues/${encodeURIComponent(id)}#${id === "tokyo-dome" ? "dome-seats" : "venue-seats"}`;
}

export function getPublicVenueName(id: string, fallback: string): string {
  if (id === "gaishi-hall") return "クロコくんホール（旧日本ガイシホール）";
  if (id === "marine-messe") return "マリンメッセ福岡A館";
  if (id === "paypay-dome") return "みずほPayPayドーム福岡";
  if (id === "sapporo-dome") return "大和ハウス プレミストドーム（札幌ドーム）";
  if (id === "mufg-stadium") return "MUFGスタジアム（国立競技場）";
  if (id === "edion-arena") return "エディオンアリーナ大阪";
  return fallback;
}

export function buildPublicVenueMetadata(id: string, name: string, editorialDescription?: string) {
  const publicName = getPublicVenueName(id, name);
  const hasGuide = hasPublicVenueGuide(id);
  const title = hasGuide
    ? `${publicName}の座席表・アクセス・ロッカー・売店ガイド`
    : `${publicName}の座席表・ライブ情報｜公演予定・座席レポ`;
  const description = hasGuide && venueGuideDescriptions[id]
    ? `${publicName}の座席表・会場ガイド。${venueGuideDescriptions[id]}`
    : hasGuide
      ? `${publicName}の座席を図から確認。トイレ・ロッカー・売店、周辺の荷物預かり、駅からのアクセスと公演予定・座席レポをまとめて確認できます。`
      : editorialDescription ?? `${publicName}で開催されるライブ・コンサートの公演予定、座席報告、当落レポ、アリーナ予想をまとめて確認できます。`;
  return buildMeta({ path: `/venues/${id}`, title, description });
}
