import assert from "node:assert/strict";
import test from "node:test";
import { ARTISTS } from "../src/lib/artists.ts";
import { VENUES } from "../src/lib/eventCrawlerConfig.ts";
import { ARTIST_SEARCH_ALIASES } from "../src/lib/artistSearchAliases.ts";
import { VENUE_SEARCH_ALIASES } from "../src/lib/venueSearchAliases.ts";
import { parseSearchQuery } from "../src/lib/searchQuery.ts";
import { getPublicVenueName } from "../src/lib/publicVenueGuides.ts";
import type { CrawledEvent } from "../src/lib/types.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:3247";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-search-test";
const { searchArtists, searchVenues, rankEventSearchResults, searchEvents } = await import("../src/lib/search.ts");
const artists = ARTISTS.filter((artist) => artist.slug !== "test");
const hiragana = (value: string) => value.normalize("NFKC").replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
const event = (id: string, artist_slug: string, venue_id: string, title = "2026 ARENA TOUR"): CrawledEvent => ({
  id, title, artist_slug, venue_id, venue: VENUES.find((venue) => venue.id === venue_id)?.name ?? venue_id,
  date: "2026-11-07", genre: "other", lottery_types: [],
} as CrawledEvent);

test("every public artist and venue has a working reading and alias with seat intent", () => {
  for (const artist of artists) {
    assert.ok(ARTIST_SEARCH_ALIASES[artist.slug]?.length, artist.slug);
    for (const name of [artist.name, ...ARTIST_SEARCH_ALIASES[artist.slug]]) {
      for (const query of [name, `${name} 席`, `${hiragana(name)}座席表`]) {
        assert.ok(searchArtists(query).some((found) => found.slug === artist.slug), `${artist.slug}: ${query}`);
      }
    }
  }
  for (const venue of VENUES) {
    assert.ok(VENUE_SEARCH_ALIASES[venue.id]?.length, venue.id);
    for (const name of [venue.name, getPublicVenueName(venue.id, venue.name), ...VENUE_SEARCH_ALIASES[venue.id]]) {
      for (const query of [name, `${name} 席`, `${hiragana(name)}座席表`]) {
        assert.ok(searchVenues(query).some((found) => found.id === venue.id), `${venue.id}: ${query}`);
        assert.deepEqual(parseSearchQuery(query).remainder, [], query);
      }
    }
  }
});

test("all 96 by 26 name combinations resolve in either order", () => {
  for (const artist of artists) for (const venue of VENUES) {
    for (const query of [`${artist.name} ${venue.name} 席`, `${venue.name} ${artist.name} 座席表`, `${artist.name}${venue.name}席`]) {
      const parsed = parseSearchQuery(query);
      assert.deepEqual(parsed.artistSlugs, [artist.slug], query);
      assert.deepEqual(parsed.venueIds, [venue.id], query);
      assert.deepEqual(parsed.remainder, [], query);
    }
  }
});

test("artist AND venue are enforced for readings, compact forms and missing slug", () => {
  const target = event("sapporo", "number-i", "sapporo-dome");
  const rows = [event("tokyo", "number-i", "tokyo-dome"), event("other", "snow-man", "sapporo-dome"), target];
  for (const query of [
    "number_i 札幌ドーム 座席", "number_i 札幌ドーム", "number_i 札幌ドーム 座席表",
    "なんばーあい さっぽろどーむ 席", "ナンバーアイ札幌ドーム座席表", "札幌ドーム Number i シートマップ",
    "ＮＵＭＢＥＲ＿Ｉ　サッポロドーム　席",
    "number_i 札幌ドーム s席", "Number_i 札幌ドーム Ｓ 席", "Number_i 札幌ドーム 座席 表",
  ]) assert.deepEqual(rankEventSearchResults(query, rows, searchArtists(query)).map((row) => row.id), ["sapporo"], query);
  const withoutSlug = { ...target, artist_slug: null, title: "Number_i DOME TOUR 2026" };
  assert.equal(rankEventSearchResults("なんばーあい 札幌ドーム 席", [withoutSlug], []).length, 1);
  assert.equal(rankEventSearchResults("ナンバーアイ札幌ドーム 未知の公演", rows, searchArtists("Number_i")).length, 0);
  assert.equal(rankEventSearchResults("ナンバーアイ札幌ドーム 空席", rows, searchArtists("Number_i")).length, 0);
});

test("short artist names do not match inside LIVE or unrelated names; partial input remains usable", () => {
  for (const query of ["LIVE", "PIANO", "HAEINISM", "EXOFIRE"]) {
    assert.deepEqual(parseSearchQuery(query).artistSlugs, [], query);
  }
  assert.deepEqual(parseSearchQuery("IVE LIVE 東京ドーム 席").artistSlugs, ["ive"]);
  assert.ok(searchArtists("Nizi").some((artist) => artist.slug === "niziu"));
  assert.ok(searchVenues("とうきょうど").some((venue) => venue.id === "tokyo-dome"));
  assert.deepEqual(searchArtists("席"), []);
  assert.deepEqual(searchVenues("座席表"), []);
  assert.deepEqual(parseSearchQuery("あの日の約束").artistSlugs, []);
  assert.deepEqual(parseSearchQuery("あのライブハウス").artistSlugs, []);
  assert.deepEqual(rankEventSearchResults("あの日の約束", [event("title", "snow-man", "tokyo-dome", "あの日の約束")], []).map(row => row.id), ["title"]);
});

test("DB text prefilter keeps original katakana and legacy artist spellings", async () => {
  const rows = [event("musical", "snow-man", "tokyo-dome", "ミュージカル スペシャルコンサート"), {
    ...event("legacy", "number-i", "sapporo-dome", "ナンバーアイ LIVE TOUR 2026"), artist_slug: null,
  }];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const filter = url.searchParams.get("title") ?? url.searchParams.get("venue");
    const field = url.searchParams.has("title") ? "title" : "venue";
    const needle = filter?.replace(/^ilike\.%|%$/g, "").replace(/\\([_%\\])/g, "$1").toLowerCase();
    const data = needle ? rows.filter(row => row[field].toLowerCase().includes(needle)) : [];
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    assert.deepEqual((await searchEvents("ミュージカル")).map(row => row.id), ["musical"]);
    assert.deepEqual((await searchEvents("ナンバーアイ")).map(row => row.id), ["legacy"]);
  } finally { globalThis.fetch = originalFetch; }
});

test("database prefetch uses both canonical IDs, retaining the requested venue before the cap", async () => {
  const requests: URL[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requests.push(new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url));
    return new Response(JSON.stringify([event("sapporo", "number-i", "sapporo-dome"), event("tokyo", "number-i", "tokyo-dome")]), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const result = await searchEvents("なんばーあい さっぽろどーむ 席");
    assert.deepEqual(result.map((row) => row.id), ["sapporo"]);
    assert.ok(requests.some((url) => url.searchParams.get("artist_slug") === "in.(number-i)"
      && url.searchParams.get("venue_id") === "in.(sapporo-dome)"));
    requests.length = 0;
    await searchEvents("なごやどーむ 席");
    assert.ok(requests.some((url) => url.searchParams.get("venue_id") === "in.(vantelin-dome,nagoya-dome)"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
