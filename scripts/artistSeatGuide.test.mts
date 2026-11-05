import assert from "node:assert/strict";
import test from "node:test";
import { getArtistSeatGuideVenues } from "../src/lib/artistSeatGuide.ts";
import { getPublicVenueSeatGuideHref } from "../src/lib/publicVenueGuides.ts";
import type { CrawledEvent } from "../src/lib/types.ts";

const event = (id: string, changes: Partial<CrawledEvent> = {}): CrawledEvent => ({
  id, title: "Snow Man DOME TOUR", artist_slug: "snow-man", venue_id: "tokyo-dome", venue: "東京ドーム", date: "2026-12-01", genre: "johnnys", lottery_types: [], ...changes,
} as CrawledEvent);

test("venue seat guides retain every dated performance and prioritize upcoming venues", () => {
  const rows = [
    event("old", { date: "2025-01-01", venue_id: "kyocera-dome" }),
    event("soon", { date: "2026-11-06", venue_id: "sapporo-dome" }),
    event("day", { title: "Snow Man DOME TOUR 昼公演" }),
    event("night", { title: "Snow Man DOME TOUR 夜公演" }),
    event("older", { date: "2026-10-01" }),
  ];
  const groups = getArtistSeatGuideVenues("snow-man", rows, "2026-11-05");
  assert.deepEqual(groups.map(group => group.id), ["sapporo-dome", "tokyo-dome", "kyocera-dome"]);
  assert.equal(groups[0].href, "/venues/sapporo-dome#venue-seat-guide");
  assert.match(groups[0].name, /札幌ドーム/);
  assert.deepEqual(groups[1].upcoming.map(row => row.id), ["day", "night"]);
  assert.deepEqual(groups[1].past.map(row => row.id), ["older"]);
});

test("no test, foreign artist, unknown venue, title-only or undated event becomes a seat link", () => {
  const rows = [
    event("test", { title: "【テストデータ】Snow Man DOME TOUR" }),
    event("foreign", { artist_slug: "number-i" }),
    event("unknown", { venue_id: "unknown", venue: "未登録の会場" }),
    event("title-only", { title: "Snow Man" }),
    event("undated", { date: null }),
  ];
  assert.deepEqual(getArtistSeatGuideVenues("snow-man", rows, "2026-11-05"), []);
  assert.deepEqual(getArtistSeatGuideVenues("unknown", [event("known")]), []);
});

test("registered old IDs and complete venue names resolve without inferring an unknown name", () => {
  const groups = getArtistSeatGuideVenues("snow-man", [
    event("legacy", { venue_id: "fukuoka-paypay-dome", venue: "福岡ドーム" }),
    event("unregistered", { venue_id: "fukuoka-dome", venue: "福岡の会場" }),
  ], "2026-11-05");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, "paypay-dome");
  assert.equal(groups[0].href, "/venues/paypay-dome#venue-seat-guide");
  assert.deepEqual(groups[0].upcoming.map(row => row.id), ["legacy"]);
});

test("official-feed names connect the three missed performances without changing their records", () => {
  const records = [
    event("aa1088607becce201951", { venue_id: "official-feed", venue: "クロコくんホール" }),
    event("534bfee09568546049c4", { venue_id: "official-feed", venue: "KYOCERA DOME OSAKA" }),
    event("e6cfccc75af3159fa2e6", { venue_id: "official-feed", venue: "KYOCERA DOME OSAKA" }),
  ];
  const before = structuredClone(records);
  const groups = getArtistSeatGuideVenues("snow-man", records, "2026-11-05");
  assert.deepEqual(groups.map(row => row.href).sort(), ["/venues/gaishi-hall#venue-seat-guide", "/venues/kyocera-dome#venue-seat-guide"]);
  assert.equal(groups.flatMap(row => row.upcoming).length, 3);
  assert.deepEqual(records, before);
  assert.equal(getPublicVenueSeatGuideHref(null, " kyocera  dome osaka "), "/venues/kyocera-dome#venue-seat-guide");
  assert.equal(getPublicVenueSeatGuideHref("tokyo-dome", "KYOCERA DOME OSAKA"), "/venues/tokyo-dome#venue-seat-guide");
  for (const name of ["", "大阪", "京セラ", "KYOCERA DOME OSAKA / 東京ドーム", "クロコくんホール 第2競技場", "マリンメッセ福岡B館"]) {
    assert.equal(getPublicVenueSeatGuideHref("unknown", name), null, name);
  }
});

test("safe keyword matches are accepted without rewriting event IDs or repeating duplicates", () => {
  const row = event("keyword", { artist_slug: null });
  const groups = getArtistSeatGuideVenues("snow-man", [row, row], "2026-11-05");
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].upcoming.map(item => item.id), ["keyword"]);
});
