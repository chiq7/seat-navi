import rawSources from "@/data/officialSeatSources.json";
import rawGuidance from "@/data/officialEventGuidance.json";
import { normalizeForMatch } from "./keywordMatch";
import type { CrawledEvent } from "./types";

export type OfficialSeatSource = {
  id: string;
  names: string[];
  url: string;
  kind: "venue-seating" | "layout" | "event-seating" | "event-area" | "venue-floor" | "event-guidance";
  checkedAt: string;
  note?: string;
  events?: { id: string; date: string; artistSlug: string; venue: string }[];
};

export const OFFICIAL_SEAT_SOURCES = [...rawSources, ...rawGuidance] as OfficialSeatSource[];
const normalizedName = (value: string) => normalizeForMatch(value).replace(/\s+/g, " ");
const priority = { "event-seating": 0, "venue-seating": 1, layout: 2, "venue-floor": 3, "event-area": 4, "event-guidance": 5 };

/** Facility names match in full; dated organizer maps also require the recorded performance. */
export function getOfficialSeatSources(event: Pick<CrawledEvent, "id" | "venue" | "date" | "artist_slug">): OfficialSeatSource[] {
  const name = normalizedName(event.venue);
  if (!name) return [];
  return OFFICIAL_SEAT_SOURCES.filter(source => source.names.some(value => normalizedName(value) === name)
    && (!source.events || source.events.some(record => record.id === event.id && record.date === event.date
      && record.artistSlug === event.artist_slug && normalizedName(record.venue) === name)))
    .sort((a, b) => priority[a.kind] - priority[b.kind]);
}

export function officialSeatSourceLabel(source: OfficialSeatSource): string {
  if (source.kind === "event-guidance") return "会場・入場方法の公式案内を見る";
  if (source.kind === "event-seating") return "主催者の公演座席表を見る";
  if (source.kind === "event-area") return "主催者の会場マップを見る";
  if (source.kind === "layout") return "会場公式の客席レイアウト例を見る";
  if (source.kind === "venue-floor") return "会場公式のフロアマップを見る";
  return "会場公式の座席表を見る";
}
