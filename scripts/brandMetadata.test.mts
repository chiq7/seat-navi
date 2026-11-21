import assert from "node:assert/strict";
import test from "node:test";
import { buildMeta, MIN_PHOTO_COUNT_FOR_TITLE, seatPhotoTitle, withSiteTitle } from "../src/lib/metadata.ts";
import { buildSiteStructuredData } from "../src/lib/structuredData.ts";

test("home has one WebSite with its existing identity and the Japanese aliases only", () => {
  const data = buildSiteStructuredData();
  const sites = data["@graph"].filter(entry => entry["@type"] === "WebSite");
  assert.equal(sites.length, 1);
  assert.equal(data["@context"], "https://schema.org");
  assert.equal(sites[0].name, "ちけレポ");
  assert.equal(sites[0].url, "https://tixrepo.com/");
  assert.deepEqual(sites[0].alternateName, ["チケレポ", "ちけれぽ"]);
  assert.ok(!JSON.stringify(data).includes("TixRepo"));
  assert.equal(sites[0].publisher?.["@id"], "https://tixrepo.com/#organization");
});

test("seat photo badges start at five and brand suffixes are idempotent", () => {
  assert.equal(MIN_PHOTO_COUNT_FOR_TITLE, 5);
  for (const n of [0, 1, 3, 4, -1, NaN]) assert.equal(seatPhotoTitle("座席表", n), "座席表 - ちけレポ");
  assert.equal(seatPhotoTitle("座席表", 5), "【写真5枚】座席表 - ちけレポ");
  assert.equal(seatPhotoTitle("座席表", 55), "【写真55枚】座席表 - ちけレポ");
  for (const value of ["座席表 - ちけレポ", "座席表｜ちけレポ", "座席表 - ちけレポ - ちけレポ"]) {
    assert.equal(withSiteTitle(value), "座席表 - ちけレポ");
  }
});

test("shared social metadata preserves the route title, canonical, image and noindex rules", () => {
  const image = "/api/og/event/test";
  const result = buildMeta({path:"/events/alternate",canonicalPath:"/events/original",title:"既存の固定タイトル",description:"元の説明",image,index:false,follow:true});
  assert.equal(result.title, "既存の固定タイトル");
  assert.equal(result.openGraph?.title, result.title);
  assert.equal(result.twitter?.title, result.title);
  assert.equal(result.openGraph?.description, result.description);
  assert.equal(result.twitter?.description, result.description);
  assert.equal(result.openGraph?.siteName, "ちけレポ");
  assert.deepEqual(result.alternates, { canonical: "https://tixrepo.com/events/original" });
  assert.deepEqual(result.robots, {index:false,follow:true});
  assert.deepEqual(result.twitter?.images, [image]);
});