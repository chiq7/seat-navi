import type { SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";

// Anonymous address regression only. Imported by this dev-only page and tests, never by normal event pages.
export const fixtureEvents = [
  { id: "93dec1e9b401d54ac03e", date: "2026-09-19" },
  { id: "42f4c61d6af9abb78c60", date: "2026-09-20" },
];
export const fixtureReports: SeatReport[] = [["D11", 9, 3], ["E5", 3, 5], ["F6", 14, 6]].map(([block, row, seat], index) => ({
  id: `local-regression-${index}`, event_id: fixtureEvents[0].id, block: String(block), row_num: Number(row), seat_num: Number(seat),
  lottery_type: "general", lottery_round: null, lottery_name: null, comment: null, created_at: "2026-09-15T22:00:00Z",
}));
export const addedFixture: SeatReport = {
  ...fixtureReports[0], id: "local-added", block: "G8", row_num: 1, seat_num: 6, created_at: "2026-09-19T01:00:00Z",
};
export const secondDayFixture: SeatReport = {
  ...fixtureReports[0], id: "local-day2", event_id: fixtureEvents[1].id, row_num: 10, seat_num: 4, created_at: "2026-09-20T01:00:00Z",
};
export const externalFixture: ExternalSeatObservation = {
  id: "local-external", event_id: fixtureEvents[0].id, source_type: "other", source_url: null,
  observed_at: "2026-09-19T01:00:00Z", seat_area: "arena", block: "F6", row_min: 14, row_max: 14,
  seat_min: 6, seat_max: 6, gate: null, level: null, confidence: "exact", evidence_summary: "試験用", review_status: "approved",
};
