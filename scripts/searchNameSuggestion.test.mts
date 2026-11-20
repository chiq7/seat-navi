import assert from "node:assert/strict";
import { test } from "node:test";
import { ARTISTS } from "../src/lib/artists.ts";
import { ARTIST_SEARCH_ALIASES } from "../src/lib/artistSearchAliases.ts";
import { getRomajiSearchNames } from "../src/lib/artistRomajiSearch.ts";
import { parseSearchQuery } from "../src/lib/searchQuery.ts";
import { getSearchNameSuggestion } from "../src/lib/searchNameSuggestion.ts";

test("every published artist can be found by their name and the generated readings", () => {
  const artists = ARTISTS.filter(artist => artist.slug !== "test");
  let generated = 0;
  for (const artist of artists) {
    assert.ok(parseSearchQuery(artist.name).artistSlugs.includes(artist.slug), artist.name);
    const aliases = getRomajiSearchNames(ARTIST_SEARCH_ALIASES[artist.slug] ?? []);
    for (const alias of aliases) {
      assert.deepEqual(parseSearchQuery(alias).artistSlugs, [artist.slug], alias);
      generated++;
    }
  }
  assert.ok(artists.length > 0);
  assert.ok(generated >= 100, String(generated));
});

test("katakana, hiragana and romanized aliases retain venue or search intent", () => {
  for (const query of ["sukizu 東京ドーム", "ｽｷｽﾞ 東京ドーム", "すきず 東京ドーム"]) {
    const parsed = parseSearchQuery(query);
    assert.deepEqual(parsed.artistSlugs, ["stray-kids"]);
    assert.deepEqual(parsed.venueIds, ["tokyo-dome"]);
  }
  assert.deepEqual(parseSearchQuery("ikōrurabu").artistSlugs, ["equal-love"]);
  assert.deepEqual(parseSearchQuery("nizyu").artistSlugs, ["niziu"]);
});

test("one typo or omission leads to a suggestion without rewriting the user's search", () => {
  for (const query of ["sno man", "snow mna", "スノーマソ"]) {
    const suggestion = getSearchNameSuggestion(query, false);
    assert.deepEqual(suggestion, { title: "Snow Man", href: "/artists/snow-man", correction: true }, query);
  }
  const query = "numebr_i Kアリーナ 2026-11-05 座席";
  const suggestion = getSearchNameSuggestion(query, false);
  assert.equal(suggestion?.title, "Number_i");
  const corrected = new URL(suggestion?.href ?? "", "https://tixrepo.com").searchParams.get("q") ?? "";
  assert.equal(corrected, "Number_i Kアリーナ 2026-11-05 座席");
  const parsed = parseSearchQuery(corrected);
  assert.deepEqual(parsed.artistSlugs, ["number-i"]);
  assert.deepEqual(parsed.venueIds, ["k-arena"]);
  assert.deepEqual(parsed.dates, ["2026-11-05"]);
  assert.equal(getSearchNameSuggestion("sno man", true), null);
});

test("the site name links to the homepage and short unrelated inputs stay unrelated", () => {
  for (const query of ["ちけレポ", "ちけれぽ", "チケレポ 公式", "chikerepo", "tikerepo", "TixRepo", "https://tixrepo.com/"]) {
    assert.deepEqual(getSearchNameSuggestion(query, false), { title: "ちけレポ トップ", href: "/", correction: false }, query);
  }
  for (const query of ["ちけれほ", "tixreop"]) {
    assert.deepEqual(getSearchNameSuggestion(query, false), { title: "ちけレポ トップ", href: "/", correction: true }, query);
  }
  for (const query of ["IVE", "LIVE", "zz", "東京ドーム", "公式情報"]) assert.equal(getSearchNameSuggestion(query, false), null, query);
});

