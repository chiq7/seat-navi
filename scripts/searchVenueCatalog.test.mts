import assert from "node:assert/strict";
import test from "node:test";
import { SEARCH_VENUE_CATALOG } from "../src/data/searchVenueCatalog.ts";
import { ARTISTS } from "../src/lib/artists.ts";
import { parseSearchQuery } from "../src/lib/searchQuery.ts";
import { SEARCH_REGIONS, SEARCH_CONTENT_INTENTS, getSearchDiscoveryResults } from "../src/lib/searchDiscovery.ts";
import type { CrawledEvent } from "../src/lib/types.ts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:3247";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "local-catalog-test";
const { searchVenues, searchArtists, rankEventSearchResults } = await import("../src/lib/search.ts");
const hiragana = (value: string) => value.normalize("NFKC").replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
const katakana = (value: string) => value.normalize("NFKC").replace(/[ぁ-ゖ]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60));
const forms = (values: readonly string[]) => [...new Set(values.flatMap(value => [value, hiragana(value), katakana(value)]))];
const discovery = (query: string, events: CrawledEvent[] = []) => {
  const parsed = parseSearchQuery(query);
  return getSearchDiscoveryResults(query, { ...parsed, events }, 1000);
};

test("every registered venue name and reading resolves to the same real venue and a supported destination", () => {
  for (const venue of SEARCH_VENUE_CATALOG) {
    const allowed = venue.guideId ? [`/venues/${venue.guideId}#venue-seat-guide`]
      : venue.eventIds.map(id => `/events/${id}#performance-seat-links`);
    assert.ok(allowed.length, `No destination registered: ${venue.id}`);
    for (const name of forms([venue.name, ...venue.aliases, ...venue.eventVenueNames])) {
      for (const query of [name, `${name} 席`]) {
        const parsed = parseSearchQuery(query);
        assert.deepEqual(parsed.venueIds, [venue.id], `${venue.id}: ${query}`);
        assert.deepEqual(parsed.remainder, [], `Unconsumed name: ${query}`);
        const results = searchVenues(query);
        const result = results.find(row => row.id === venue.id);
        assert.ok(result, `Venue result missing: ${query}`);
        assert.ok(allowed.includes(result.href), `Unsupported destination: ${query} -> ${result.href}`);
      }
    }
  }
});

test("every region spelling selects only its defined prefectures and city", () => {
  for (const region of SEARCH_REGIONS) {
    // Independent expectation from catalogue geography, not the production matcher.
    const expected = SEARCH_VENUE_CATALOG.filter(venue => venue.kind === "venue"
      && venue.prefecture && region.prefectures.includes(venue.prefecture)
      && (!region.locality || venue.locality?.startsWith(region.locality)))
      .map(venue => venue.id).sort();
    for (const term of forms([region.label, ...region.aliases])) {
      const query = `${term} ライブ 会場`;
      const parsed = parseSearchQuery(query);
      assert.ok(parsed.regionIds.includes(region.id), `${region.id}: ${query}`);
      assert.deepEqual(parsed.remainder, [], `Unconsumed region: ${query}`);
      assert.deepEqual(searchVenues(query).map(venue => venue.id).sort(), expected, query);
    }
  }
  assert.ok(!searchVenues("仙台 会場").some(venue => venue.id === "miyagi-arena"), "Rifu is not Sendai city");
  assert.ok(searchVenues("宮城 会場").some(venue => venue.id === "miyagi-arena"));
  assert.deepEqual(searchVenues("東京 大阪 会場"), [], "Conflicting region constraints must not become OR");
  assert.ok(searchVenues("中国地方 会場").every(venue => SEARCH_VENUE_CATALOG.find(row => row.id === venue.id)?.region !== "海外"));
});

test("registered content words preserve their intended artist destination", () => {
  const paths: Record<string, string> = {
    seat: "/artists/number-i", view: "/artists/number-i/after-reports", setlist: "/artists/number-i/setlist",
    reports: "/artists/number-i/after-reports", ticket: "/artists/number-i#ticket-data",
    prediction: "/artists/number-i", schedule: "/artists/number-i#upcoming-events", news: "/artists/number-i/news",
  };
  for (const intent of SEARCH_CONTENT_INTENTS) {
    if (!paths[intent.id]) continue;
    for (const term of forms(intent.terms)) {
      const query = `Number_i ${term}`;
      assert.ok(discovery(query).some(result => result.href === paths[intent.id]), `${query}: ${paths[intent.id]}`);
    }
  }
  assert.equal(searchArtists("NEWS")[0]?.slug, "news", "Artist NEWS remains findable");
  assert.ok(discovery("Number_i ニュース").some(result => result.href === "/artists/number-i/news"));
  assert.ok(discovery("Adoニュース").some(result => result.href === "/artists/ado/news"));
  assert.ok(discovery("嵐ニュース").some(result => result.href === "/artists/arashi/news"));
  assert.ok(discovery("公式ニュース").some(result => result.href === "/about"));
});

test("all published venue guides have the documented feature destinations", () => {
  for (const venue of SEARCH_VENUE_CATALOG.filter(row => row.guideId)) {
    const base = `/venues/${venue.guideId}`;
    const expected: Record<string, string> = {
      席: `${base}#venue-seat-guide`,
      アクセス: `${base}#${venue.guideId === "tokyo-dome" ? "dome-access" : "venue-access"}`,
      トイレ: `${base}#${venue.guideId === "tokyo-dome" ? "dome-spots" : "venue-facilities"}`,
      ロッカー: `${base}#${venue.guideId === "tokyo-dome" ? "dome-spots" : "venue-facilities"}`,
      キャパ: base, 日程: `${base}#upcoming-events-title`,
    };
    for (const [word, href] of Object.entries(expected)) assert.ok(discovery(`${venue.name} ${word}`).some(row => row.href === href), `${venue.name} ${word} -> ${href}`);
  }
});

test("real venue identity and date constrain an artist query to the requested performance", () => {
  // Captured public event values; only the two negative controls are synthetic.
  const target = {
    id: "d50f07c7ed6b2184a707", title: "CANDY TUNE 3rd ANNIVERSARY LIVE 2026", venue: "GLION ARENA KOBE",
    venue_id: "official-news-4ce9eb782f9d0fe5", date: "2026-07-21", genre: "female_idol", lottery_types: [], artist_slug: "candy-tune",
  } as CrawledEvent;
  const controls = [target, { ...target, id: "other-date", date: "2026-07-22" }, { ...target, id: "other-venue", venue: "東京ドーム", venue_id: "tokyo-dome" }];
  for (const query of ["キャンチュー ジーライオンアリーナ神戸 2026-07-21 席", "CANDY TUNE GLION ARENA KOBE 2026-07-21 座席表"]) {
    assert.deepEqual(rankEventSearchResults(query, controls, searchArtists(query)).map(row => row.id), [target.id], query);
  }
  assert.deepEqual(searchVenues("GLION ARENA KOBE 未知の公演", 200, []), [], "Unknown titles must not fall back to an unrelated representative event");
  assert.deepEqual(searchVenues("GLION ARENA KOBE 2099-01-01", 200, []), [], "Unknown dates must not fall back to an unrelated representative event");
  const yearlyTitle = { ...target, id: "2025", title: "幕張ビーチ花火フェスタ2025", venue: "ZOZOマリンスタジアム", venue_id: "zozo-marine", date: "2025-08-02", artist_slug: null };
  const nextYear = { ...yearlyTitle, id: "2026", date: "2026-08-02" };
  for (const date of ["2025-08-02", "2025/08/02"]) {
    const query = `幕張ビーチ花火フェスタ2025 ZOZOマリンスタジアム ${date} 座席`;
    assert.deepEqual(rankEventSearchResults(query, [yearlyTitle, nextYear], []).map(row => row.id), ["2025"], query);
  }
  assert.equal(ARTISTS.filter(row => row.slug !== "test").length, 96);
});

test("artist, unknown title or date constraints prevent region-wide representative fallbacks", () => {
  const tokyo = { id: "scoped-number-tokyo", title: "Number_i DOME TOUR 2026", venue: "東京ドーム", venue_id: "tokyo-dome",
    artist_slug: "number-i", date: "2026-12-09", genre: "other", lottery_types: [] } as CrawledEvent;
  assert.deepEqual(searchVenues("Number_i 関東 席", 200, [tokyo]).map(row => row.id), ["tokyo-dome"]);
  for (const query of ["Number_i 関東 席", "関東 未知の公演 席", "関東 2099-01-01 席"]) {
    assert.deepEqual(searchVenues(query, 200, []), [], query);
  }
});
