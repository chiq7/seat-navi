import assert from "node:assert/strict";
import test from "node:test";
import { dedupeVenueEventsForDisplay, getSamePerformanceEventIds } from "../src/lib/eventDisplay.ts";
import type { CrawledEvent } from "../src/lib/types.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:3247";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-integrity-test";
const { rankEventSearchResults, searchArtists, groupSearchEventsByDate } = await import("../src/lib/search.ts");
const today = "2026-11-13";
const base = "YOASOBI ASIA 10-CITY DOME & STADIUM TOUR 2026-2027";
const event = (id: string, date: string | null, title = base): CrawledEvent => ({
  id, date, title, venue_id: "tokyo-dome", venue: "東京ドーム", artist_slug: "yoasobi", genre: "other", lottery_types: [],
} as CrawledEvent);
const tokyo = [
  event("43f8a5c3a1de54fdc8c8", "2026-12-05"),
  event("15d75aefc8788cfd31ba", "2026-12-05", base + " 「超惑星」"),
  event("0e6cab355419387e1f20", "2026-12-06"),
  event("d21d4d3fc1411af1e680", "2026-12-06", base + " 「超惑星」"),
];
const search = (events: CrawledEvent[]) => rankEventSearchResults("YOASOBI 東京ドーム", events, searchArtists("YOASOBI"), 30, today);

test("Tokyo December 5 and 6 each have one stable searchable performance", () => {
  assert.deepEqual(search(tokyo).map(row => row.id), ["15d75aefc8788cfd31ba", "d21d4d3fc1411af1e680"]);
  assert.deepEqual(search([...tokyo].reverse()).map(row => row.id), search(tokyo).map(row => row.id));
  assert.equal(tokyo.length, 4, "saved IDs remain intact");
});

test("a nonrepresentative saved title still resolves to the stable displayed performance", () => {
  const rows = [event("alias", "2026-12-05", "YOASOBI THE BOOK TOUR"), event("display", "2026-12-05", "YOASOBI 図書館ツアー")];
  const result = rankEventSearchResults("YOASOBI THE BOOK", rows, searchArtists("YOASOBI"), 30, today);
  assert.deepEqual(result.map(row => row.id), ["display"]);
});

test("matinee, evening, timed sessions and unknown session cannot be merged", () => {
  for (const titles of [["昼公演", "夜公演"], ["第1部", "第2部"], ["開演13:00", "開演18:00"], ["", "夜公演"]]) {
    const rows = titles.map((title, i) => event(String(i), "2026-12-05", `${base} ${title}`));
    assert.equal(search(rows).length, 2, titles.join(" / "));
    assert.deepEqual(getSamePerformanceEventIds(rows, rows[0]), [rows[0].id]);
  }
});

test("near future precedes distant future, with past dates in a separate recent-first group", () => {
  const rows = [event("far", "2027-02-01"), event("past-old", "2026-09-01"), event("near", "2026-11-14"), event("past-new", "2026-11-12"), event("unknown", null)];
  const found = search(rows);
  assert.deepEqual(found.map(row => row.id), ["near", "far", "past-new", "past-old", "unknown"]);
  assert.deepEqual(groupSearchEventsByDate(found, today).map(group => [group.id, group.events.map(row => row.id)]), [
    ["upcoming", ["near", "far"]], ["past", ["past-new", "past-old"]], ["undated", ["unknown"]],
  ]);
});

test("same-show aliases retain their reports but the next day's seat never belongs to this day", () => {
  const ids = getSamePerformanceEventIds(tokyo, tokyo[1]);
  assert.deepEqual(new Set(ids), new Set([tokyo[0].id, tokyo[1].id]));
  const reports = [
    { event_id: tokyo[0].id, block: "B14", row_num: 9, seat_num: 5 },
    { event_id: tokyo[1].id, block: "A3", row_num: 2, seat_num: 4 },
    { event_id: tokyo[2].id, block: "C1", row_num: 3, seat_num: 8 },
  ];
  assert.deepEqual(reports.filter(row => ids.includes(row.event_id)).map(row => row.block), ["B14", "A3"]);
  assert.deepEqual(new Set(getSamePerformanceEventIds(tokyo, tokyo[0])), new Set(ids), "old URL sees the same saved report group");
  assert.equal(dedupeVenueEventsForDisplay(tokyo).length, 2);
});

test("undated and different venues never share saved-report IDs", () => {
  const target = event("unknown-one", null);
  assert.deepEqual(getSamePerformanceEventIds([target, event("unknown-two", null)], target), [target.id]);
  const elsewhere = { ...tokyo[0], id: "sapporo", venue_id: "sapporo-dome", venue: "札幌ドーム" };
  assert.equal(getSamePerformanceEventIds([...tokyo, elsewhere], tokyo[0]).includes(elsewhere.id), false);
});
