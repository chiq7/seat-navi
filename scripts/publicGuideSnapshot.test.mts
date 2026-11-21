import test from "node:test";
import assert from "node:assert/strict";
import { validPublicGuideSnapshot } from "../src/lib/publicGuideSnapshot.ts";
import { PUBLIC_VENUE_GUIDE_IDS } from "../src/lib/publicVenueGuides.ts";
import { getVenuePhotoIndex, getVenuePhotoCovers, getEventVenuePhotoPreview } from "../src/lib/serverSeatPhotoVenues.ts";
import { staticArtistPages } from "../src/lib/staticPublicPages.ts";

test("artist snapshots must contain both menu links and their actual HTML destinations", () => {
  const path = "/artists/number-i";
  const url = "https://tixrepo.com" + path;
  const html = `<html><head><title>Number_i</title><meta name="description" content="ライブ情報"><link rel="canonical" href="${url}"></head>
    <body><script type="application/ld+json">{"@id":"${url}#artist"}</script><h1>Number_i</h1>
    <a href="#ticket-data">当落を見る</a><a href="#fan-board">ファン掲示板</a>
    <section id="ticket-data">当落・座席データ</section><section id="fan-board">ファン掲示板</section></body></html>`;
  assert.equal(validPublicGuideSnapshot(path, html, false), true);
  for (const id of ["ticket-data", "fan-board"]) {
    assert.equal(validPublicGuideSnapshot(path, html.replace(`id="${id}"`, ""), false), false);
    assert.equal(validPublicGuideSnapshot(path, html.replace(`href="#${id}"`, ""), false), false);
    const scriptOnly = html.replace(`<section id="${id}">`, `<script>var id="${id}"</script><section>`);
    assert.equal(validPublicGuideSnapshot(path, scriptOnly, false), false);
  }
});

test("the SSR inventory accounts for every distinct reviewed photo without exposing its media URL", () => {
  for (const id of PUBLIC_VENUE_GUIDE_IDS) {
    const rows = getVenuePhotoIndex(id);
    const preview = getEventVenuePhotoPreview(id);
    assert.equal(rows.reduce((sum, row) => sum + row.count, 0), preview?.count, id);
    assert.ok(rows.every(row => row.label && row.count > 0 && row.href.startsWith(`/venues/${id}`)), id);
    assert.ok(rows.every(row => !("thumbnailUrl" in row)), id);
    // The cover list (opt-in, Tokyo Dome gallery) has the same groups, and only small thumbnails.
    const key = (row: { href: string; label: string }) => row.href + "\n" + row.label;
    const covers = getVenuePhotoCovers(id);
    assert.deepEqual(covers.map(({ label, href, count }) => ({ label, href, count })).sort((a, b) => key(a).localeCompare(key(b))),
      [...rows].sort((a, b) => key(a).localeCompare(key(b))), id);
    assert.ok(covers.every(row => row.thumbnailUrl === null || /[?&](?:name=thumb|width=240)(?:&|$)/.test(row.thumbnailUrl)), id);
  }
  assert.equal(new Set(staticArtistPages).size, staticArtistPages.length);
  assert.ok(staticArtistPages.includes("/artists/number-i"));
  assert.ok(!staticArtistPages.includes("/artists/test"));
});

test("error text, incomplete markup, or the wrong canonical cannot be cached as a venue page", () => {
  const path = "/venues/tokyo-dome";
  const url = "https://tixrepo.com" + path;
  const body = `<html><head><title>東京ドーム</title><meta name="description" content="案内"><link rel="canonical" href="${url}"></head>
    <body><script type="application/ld+json">{"@id":"${url}#place"}</script><h1>東京ドーム</h1><div id="venue-seat-guide"></div>
    <h2 id="seat-reading-title">座席番号の見方</h2><section data-published-photos="1"><h2 id="seat-photo-title">写真一覧</h2><ul id="seat-photo-inventory"></ul></section></body></html>`;
  assert.equal(validPublicGuideSnapshot(path, body, false), true);
  assert.equal(validPublicGuideSnapshot(path, body.replace("</h1>", "</h1>会場ガイドを読み込めませんでした。"), false), false);
  assert.equal(validPublicGuideSnapshot(path, body.replaceAll("tokyo-dome", "k-arena"), false), false);
  assert.equal(validPublicGuideSnapshot(path, body.replace("</html>", ""), false), false);
  assert.equal(validPublicGuideSnapshot(path, body.replace('id="seat-photo-inventory"', ''), false), false);
  assert.equal(validPublicGuideSnapshot(path, body.replace('id="seat-photo-inventory"', '').replace("</body>", '<script>id="seat-photo-inventory"</script></body>'), false), false);
  assert.equal(validPublicGuideSnapshot(path, body.replace('data-published-photos="1"','data-published-photos="0"').replace('<ul id="seat-photo-inventory"></ul>', 'この会場の座席写真はまだありません。'), false), true);
});
