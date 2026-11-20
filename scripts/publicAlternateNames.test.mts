import assert from "node:assert/strict";
import test from "node:test";
import { ARTISTS } from "../src/lib/artists.ts";
import { SEARCH_VENUE_CATALOG } from "../src/data/searchVenueCatalog.ts";
import { PUBLIC_VENUE_NAMES } from "../src/data/publicVenueNames.ts";
import {
  getPublicArtistAlternateNames, getPublicVenueAlternateNames,
  getEventVenueAlternateNames, getEventVenueForAlternateNames,
} from "../src/lib/publicAlternateNames.ts";

test("every registered artist exposes a public reading or common name without crawler-only terms", () => {
  const artists = ARTISTS.filter(a => a.slug !== "test");
  for (const {slug, name} of artists) {
    const names = getPublicArtistAlternateNames(slug, name);
    assert.ok(names.length > 0, slug);
    assert.equal(new Set(names).size, names.length, slug);
    assert.ok(!names.includes(name), slug);
  }
  assert.equal(getPublicArtistAlternateNames("equal-love", "＝LOVE")[0], "イコラブ");
  assert.equal(getPublicArtistAlternateNames("stray-kids", "Stray Kids")[0], "スキズ");
  assert.ok(getPublicArtistAlternateNames("yuzu", "ゆず").includes("ユズ"));
  assert.ok(!getPublicArtistAlternateNames("jo1", "JO1").includes("JO1DER"));
  assert.deepEqual(getPublicArtistAlternateNames("missing", "未登録"), []);
});

test("public venue names preserve old names and exclude search-only spellings and parent buildings", () => {
  for (const v of SEARCH_VENUE_CATALOG) {
    assert.equal(Boolean(PUBLIC_VENUE_NAMES[v.id]?.length), v.kind === "venue", v.id);
    const names = getPublicVenueAlternateNames(v.id, v.name);
    assert.equal(names.length > 0, v.kind === "venue", v.id);
    if (v.kind === "venue") {
      for (const name of names) assert.ok([v.name, ...v.aliases, ...v.eventVenueNames].includes(name), name);
    }
  }
  assert.ok(getPublicVenueAlternateNames("sapporo-dome", "大和ハウス プレミストドーム").includes("札幌ドーム"));
  assert.ok(getPublicVenueAlternateNames("gaishi-hall", "クロコくんホール").includes("日本ガイシホール"));
  assert.equal(getPublicVenueAlternateNames("k-arena", "Kアリーナ横浜")[0], "ケーアリーナ横浜");
  assert.equal(getPublicVenueAlternateNames("osaka-jo-hall", "大阪城ホール")[0], "城ホ");
  assert.ok(!getPublicVenueAlternateNames("saitama-super-arena", "さいたまスーパーアリーナ").includes("埼玉スーパーアリーナ"));
  assert.ok(!getPublicVenueAlternateNames("asiaworld-expo-10", "AsiaWorld-Expo Hall 10").includes("AsiaWorld-Expo"));
});

test("known performances can describe the booked room; ambiguous places never publish aliases", () => {
  for (const v of SEARCH_VENUE_CATALOG.filter(v => !v.guideId)) {
    const event = {id:v.eventIds[0], venue:v.eventVenueNames[0], venue_id:v.eventVenueIds[0]};
    assert.equal(getEventVenueForAlternateNames(event)?.id, v.id);
    assert.equal(getEventVenueAlternateNames(event).length > 0, v.kind === "venue", v.id);
  }
  assert.deepEqual(getEventVenueAlternateNames({id:"new", venue:"別のホール", venue_id:"unknown"}), []);
});
