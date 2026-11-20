import assert from "node:assert/strict";
import test from "node:test";
import { applyReviewedEventDate, reviewedEventDate } from "../src/lib/reviewedEventDates.ts";
import { makeEventId, toEventRows } from "../src/lib/eventCrawler.ts";
import { readPublicEventCatalog } from "../src/lib/publicEventCatalog.ts";
import { getSamePerformanceEventIds } from "../src/lib/eventDisplay.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:3247";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-reviewed-date-test";
const { rankEventSearchResults, searchArtists } = await import("../src/lib/search.ts");

const title = "King & Prince 「King & Princeとうちあげ花火2025」";
const base = { title, venue: "ZOZOマリンスタジアム", venue_id: "zozo-marine", genre: "johnnys", artist_slug: "king-prince", lottery_types: [] };
const wrong = { ...base, id: "f6d1d32e59ec93967700", date: "2026-11-15" };
const original = { ...base, id: "4bbf82956db06d64a82a", date: "2025-11-15" };

test("reviewed dates preserve IDs and leave unrelated dates, venues and tour years alone", () => {
  assert.deepEqual(applyReviewedEventDate(wrong), { ...wrong, date: "2025-11-15" });
  assert.equal(applyReviewedEventDate(original), original);
  assert.equal(reviewedEventDate({ ...wrong, date: "2027-11-16" }), "2025-11-16");
  for (const other of [
    { ...wrong, venue_id: "tokyo-dome" }, { ...wrong, date: "2026-11-17" },
    { ...wrong, title: title.replaceAll("2025", "2026") }, { ...wrong, title: "King & Prince TOUR 2025-2026" },
    { ...wrong, date: null },
  ]) assert.equal(applyReviewedEventDate(other), other);
});

test("the shared crawler cannot reinsert the reviewed event into an inferred future year", () => {
  const venue = { id: "zozo-marine", name: "ZOZOマリンスタジアム" };
  for (const now of [new Date("2026-07-20T09:55:31Z"), new Date("2027-07-20T09:55:31Z")]) {
    const result = toEventRows([{ title, date: "11/15・11/16", genre: "johnnys" }], venue, null, null, now, "https://www.marines.co.jp/stadium/schedule/");
    assert.deepEqual(result.rows.map(row => row.date), ["2025-11-15", "2025-11-16"]);
    assert.equal(result.rows[0].id, makeEventId(venue.id, "2025-11-15", title));
    assert.ok(result.rows.every(row => row.id !== wrong.id));
  }
});

test("old R2/static data is corrected without changing identity or pretending its timestamp is fresh", () => {
  const wrongSecond = { ...wrong, id: "799829e7f93d7c0cd517", date: "2026-11-16" };
  const other = { ...wrong, id: "other", title: "Other Artist tour", date: "2026-12-01" };
  const snapshot = { version: 1, updatedAt: "2026-11-13T14:30:00Z", events: [wrong, wrongSecond, original, other],
    home: { events: [{ id: wrong.id }, { id: other.id }], discoveryCards: [] },
    feed: [
      { id: "bad", href: `/events/${wrong.id}#seat-map`, source: "editorial", type: "公演情報" },
      { id: "real-report", href: `/events/${wrong.id}#seat-map`, source: "real", type: "座席レポ", date: "2026-11-15" },
      { id: "ok", href: `/events/${other.id}` },
    ],
  };
  const restored = readPublicEventCatalog(snapshot);
  assert.deepEqual(restored.events.map(row => row.date), ["2025-11-15", "2025-11-16", "2025-11-15", "2026-12-01"]);
  assert.deepEqual(restored.events.map(row => row.id), snapshot.events.map(row => row.id));
  assert.equal(restored.updatedAt, snapshot.updatedAt);
  assert.deepEqual(restored.home.events.map(row => row.id), [other.id]);
  assert.deepEqual(restored.feed.map(row => row.id), ["real-report", "ok"]);
  assert.equal(restored.feed[0].date, "2025-11-15", "real reports stay available with the corrected date");
  assert.equal(snapshot.events[0].date, "2026-11-15");
});

test("corrected aliases remain available but the public search shows each performance once", () => {
  const events = [wrong, original, { ...wrong, id: "799829e7f93d7c0cd517", date: "2026-11-16" }].map(applyReviewedEventDate);
  const query = "King & Prince うちあげ花火";
  const results = rankEventSearchResults(query, events, searchArtists(query), 20, "2026-11-14");
  assert.equal(events.length, 3);
  assert.deepEqual(results.map(event => event.date), ["2025-11-16", "2025-11-15"]);
});

test("old upcoming cards drop reviewed past performances, retain other performances, and keep a valid selected date", () => {
  const wrongSecond = { ...wrong, id: "799829e7f93d7c0cd517", date: "2026-11-16" };
  const other = { ...wrong, id: "valid-future", title: "King & Prince NEXT TOUR", date: "2026-12-01" };
  const card = { artistSlug: "king-prince", artistName: "King & Prince", image: "", reports: [], externalObservations: [], status: "ready", limited: false };
  const untouched = { ...card, events: [other], selectedEventId: other.id };
  const rawReport = { event_id: wrong.id, id: "preserved-report" };
  const mixed = { ...card, events: [wrong, other], selectedEventId: wrong.id, reports: [rawReport], lottery: { status: "reported", eventIds: [wrong.id, other.id], won: 1, lost: 0 } };
  const snapshot = { version: 1, updatedAt: "2026-11-13T14:30:00Z", events: [wrong, wrongSecond, original, other], home: {
    events: [], discoveryCards: [
      { ...card, events: [wrong, wrongSecond], selectedEventId: wrong.id },
      mixed,
      { ...mixed, selectedEventId: other.id },
      untouched,
    ],
  }, feed: [] };
  const restored = readPublicEventCatalog(snapshot);
  assert.equal(restored.home.discoveryCards.length, 3);
  for (const result of restored.home.discoveryCards) {
    assert.deepEqual(result.events.map(event => event.id), [other.id]);
    assert.equal(result.selectedEventId, other.id);
  }
  assert.deepEqual(restored.home.discoveryCards[0].lottery, { status: "pending", reason: "unverified" });
  assert.equal(restored.home.discoveryCards[0].reports[0], rawReport);
  assert.equal(restored.home.discoveryCards[2], untouched, "an unrelated card is not rewritten");
  assert.equal(snapshot.home.discoveryCards[0].events.length, 2, "stored snapshot and original reports are not mutated");
  assert.equal(restored.updatedAt, snapshot.updatedAt);
  assert.equal(readPublicEventCatalog(restored), restored, "already corrected catalogs stay unchanged");
});

test("reports attached to either retained November 15 ID stay with that day, separate from November 16", () => {
  const events = [wrong, original, { ...wrong, id: "799829e7f93d7c0cd517", date: "2026-11-16" }].map(applyReviewedEventDate);
  assert.deepEqual(new Set(getSamePerformanceEventIds(events, events[0])), new Set([wrong.id, original.id]));
  assert.deepEqual(getSamePerformanceEventIds(events, events[2]), ["799829e7f93d7c0cd517"]);
});
