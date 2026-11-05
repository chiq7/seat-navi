import assert from "node:assert/strict";
import test from "node:test";
import { getOfficialSeatSources, OFFICIAL_SEAT_SOURCES, officialSeatSourceLabel } from "../src/lib/officialSeatSources.ts";

const event = { id: "different-show", venue: "LaLa arena TOKYO-BAY", date: "2026-12-01", artist_slug: "exo" };

test("registered facility spellings reach the same official source without guessed venue matches", () => {
  assert.equal(getOfficialSeatSources(event)[0].id, "lala-arena");
  assert.equal(getOfficialSeatSources({ ...event, venue: "ららアリーナ 東京ベイ" })[0].id, "lala-arena");
  assert.equal(getOfficialSeatSources({ ...event, venue: "IGアリーナ" })[0].id, "ig-arena");
  assert.equal(getOfficialSeatSources({ ...event, venue: "Zepp Diver City" })[0].id, "zepp-divercity");
  for (const venue of ["東京", "東京都某所", "ららアリーナ 東京ベイ・別会場", "マリンメッセ福岡B館", "全国各地の映画館"]) {
    assert.deepEqual(getOfficialSeatSources({ ...event, venue }), [], venue);
  }
});

test("organizer charts require the recorded ID, date, artist and venue", () => {
  for (const source of OFFICIAL_SEAT_SOURCES.filter(source => source.events)) {
    assert.ok(source.events!.length > 0, source.id);
    const record = source.events![0];
    const actual = { id: record.id, venue: record.venue, date: record.date, artist_slug: record.artistSlug };
    assert.ok(getOfficialSeatSources(actual).some(item => item.id === source.id), source.id);
    for (const changes of [{ id: "another-event" }, { date: "2030-01-01" }, { artist_slug: "unrelated" }, { venue: "別会場" }]) {
      assert.equal(getOfficialSeatSources({ ...actual, ...changes }).some(item => item.id === source.id), false, source.id);
    }
  }
});

test("dedicated seat chart is shown ahead of the facility map and preserves source categories", () => {
  const source = OFFICIAL_SEAT_SOURCES.find(source => source.id === "mrs-shadows-kagawa")!;
  const record = source.events![0];
  const actual = { id:record.id, venue:record.venue, date:record.date, artist_slug:record.artistSlug };
  const links = getOfficialSeatSources(actual);
  assert.equal(links[0].kind, "event-seating");
  assert.ok(links.some(source => source.kind === "venue-seating"));
  assert.equal(officialSeatSourceLabel(links[0]), "主催者の公演座席表を見る");
  assert.equal(officialSeatSourceLabel(OFFICIAL_SEAT_SOURCES.find(source => source.kind === "layout")!), "会場公式の客席レイアウト例を見る");
  assert.equal(officialSeatSourceLabel(OFFICIAL_SEAT_SOURCES.find(source => source.kind === "event-area")!), "主催者の会場マップを見る");
  assert.equal(officialSeatSourceLabel(OFFICIAL_SEAT_SOURCES.find(source => source.kind === "venue-floor")!), "会場公式のフロアマップを見る");
  assert.equal(officialSeatSourceLabel(OFFICIAL_SEAT_SOURCES.find(source => source.kind === "event-guidance")!), "会場・入場方法の公式案内を見る");
});

test("source registry has unique identifiers and parseable official document URLs", () => {
  assert.equal(new Set(OFFICIAL_SEAT_SOURCES.map(row => row.id)).size, OFFICIAL_SEAT_SOURCES.length);
  for (const row of OFFICIAL_SEAT_SOURCES) {
    assert.ok(row.names.length > 0 && row.names.every(name => name.trim()));
    assert.match(row.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(new URL(row.url).protocol, /^https?:$/);
    assert.equal(row.url.includes("undefined"), false);
  }
});
