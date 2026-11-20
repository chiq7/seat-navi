import assert from "node:assert/strict";
import test from "node:test";
import { selectReportEvents } from "../src/lib/reportEventSelection.ts";
import type { CrawledEvent } from "../src/lib/types.ts";

const day: CrawledEvent = { id: "day", venue: "有明アリーナ", venue_id: "ariake-arena", artist_slug: "number-i",
  genre: "johnnys", date: "2024-06-18", title: "Number_i LIVE 2024（1部・開演13:30）" };
const night = { ...day, id: "night", title: "Number_i LIVE 2024（2部・開演18:00）" };
const dome = { ...day, id: "dome", venue: "東京ドーム", venue_id: "tokyo-dome" };
const ctx = { event: null, artist: null, venue: null };
const fixtures = [day, night, dome];

test("direct entry, venue and artist links let the guest choose a performance", () => {
  for (const context of [ctx, { ...ctx, venue: "ariake-arena" }, { ...ctx, artist: "number-i" }])
    assert.equal(selectReportEvents(fixtures, context).selectedEventId, null);
  const venue = selectReportEvents(fixtures, { ...ctx, venue: "ariake-arena" });
  assert.equal(venue.venueName, "有明アリーナ");
  assert.deepEqual(venue.events.map(e => e.id), ["day","night"]);
  assert.deepEqual(selectReportEvents([night, day], { ...ctx, venue: "ariake-arena" }).events.map(e => e.id), ["day","night"]);
});

test("selected links keep the original date, session and database ID even if a display duplicate exists", () => {
  for (const id of ["day", "night", "other-id"]) {
    const options = selectReportEvents([...fixtures, { ...day, id: "other-id" }], { ...ctx, event: id });
    assert.equal(options.selectedEventId, id);
    assert.ok(options.events.some(e => e.id === id));
    assert.ok(options.events.some(e => e.id === "night"));
    assert.equal(options.events.filter(e => e.venue_id === "ariake-arena").length, 2);
  }
});

test("unpublished IDs, mismatched venues and unknown venues do not select a fallback show", () => {
  for (const context of [
    { ...ctx, event:"missing" }, { ...ctx, event:"" }, { ...ctx, event:"dome", venue:"ariake-arena" }, { ...ctx, event:"night", artist:"niziu" },
    { ...ctx, event:"day", venue:"typo" },
  ]) {
    const options = selectReportEvents(fixtures, context);
    assert.ok(options.unavailableEvent);
    assert.equal(options.selectedEventId, null);
  }
  assert.deepEqual(selectReportEvents(fixtures, { ...ctx, venue:"typo" }).events, []);
});
