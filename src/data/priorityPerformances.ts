import type { CrawledEvent } from "../lib/types";

export type PriorityPerformance = {
  artist: "hana" | "number-i";
  date: string;
  venueId: string;
  venue: string;
  title: string;
  starts: readonly string[];
  source: string;
};
const numberSource = "https://www.livenationhip.co.jp/en/all-events/number_i-tickets-ae1689539?locale=ja";
const hanaSource = "https://hana.b-rave.tokyo/live/260402/";
const festivalSource = "https://hana.b-rave.tokyo/live/asia-pop-girl-fest-2027_ticket/";
export const PRIORITY_PERFORMANCES: readonly PriorityPerformance[] = [
  ...[
    ["2026-10-24", "sapporo-dome", "大和ハウス プレミストドーム", ["16:00"]],
    ["2026-12-02", "kyocera-dome", "京セラドーム大阪", ["18:30"]],
    ["2026-12-09", "tokyo-dome", "東京ドーム", ["18:30"]],
    ["2026-12-10", "tokyo-dome", "東京ドーム", ["18:30"]],
    ["2027-01-09", "vantelin-dome", "バンテリンドーム ナゴヤ", ["17:00"]],
    ["2027-01-10", "vantelin-dome", "バンテリンドーム ナゴヤ", ["12:30", "19:00"]],
    ["2027-01-11", "vantelin-dome", "バンテリンドーム ナゴヤ", ["17:00"]],
    ["2027-01-16", "paypay-dome", "みずほPayPayドーム福岡", ["17:00"]],
    ["2027-01-17", "paypay-dome", "みずほPayPayドーム福岡", ["17:00"]],
  ].map(([date, venueId, venue, starts]) => ({ artist: "number-i" as const, date: date as string, venueId: venueId as string, venue: venue as string, starts: starts as string[], title: "Number_i LIVE TOUR No.III", source: numberSource })),
  ...[
    ["2026-09-16", "osaka-jo-hall", "大阪城ホール", "18:00"],
    ["2026-09-17", "osaka-jo-hall", "大阪城ホール", "18:00"],
    ["2026-10-29", "budokan", "日本武道館", "18:00"],
    ["2026-10-30", "budokan", "日本武道館", "18:00"],
    ["2026-10-31", "budokan", "日本武道館", "16:30"],
  ].map(([date, venueId, venue, start]) => ({ artist: "hana" as const, date, venueId, venue, starts: [start], title: "HANA 1st TOUR 2026 “Born to Bloom”", source: hanaSource })),
  ...[["2027-01-22", "18:00"], ["2027-01-23", "16:00"]].map(([date, start]) => ({ artist: "hana" as const, date, venueId: "lalaarena-tokyo-bay", venue: "ららアリーナ 東京ベイ", starts: [start], title: "ASIA POP GIRL FEST 2027", source: festivalSource })),
];

const titleKey = (value: string) => value.normalize("NFKC").replace(/[\s“”"'「」]/g, "").toLowerCase();
export function matchPriorityPerformance(event: Pick<CrawledEvent, "title" | "date" | "venue_id" | "artist_slug">): PriorityPerformance | undefined {
  return PRIORITY_PERFORMANCES.find(day => day.artist === event.artist_slug && day.date === event.date
    && day.venueId === event.venue_id && titleKey(day.title) === titleKey(event.title));
}
