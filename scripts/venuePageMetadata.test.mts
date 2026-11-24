import assert from "node:assert/strict";
import test from "node:test";
import { VENUES } from "../src/lib/eventCrawlerConfig.ts";
import { buildPublicVenueMetadata, getVenuePageContent } from "../src/lib/venuePageMetadata.ts";
import { groupSeatSources, seatSourcePermalink, type SeatSourceRow } from "../src/lib/seatSourceArchive.ts";

test("all venue titles use the visible venue name and the number of photos published with its guide", () => {
  for (const venue of VENUES) {
    const page = getVenuePageContent(venue.id, venue.name);
    const metadata = buildPublicVenueMetadata(venue.id, venue.name);
    const count = page.photos?.count ?? 0;
    const prefix = count >= 20 ? `【写真${count}枚】` : count >= 1 ? "【写真あり】" : "";
    const expected = `${prefix}${page.displayName}の座席表・見え方${count >= 1 ? "" : "まとめ"} - ちけレポ`;
    assert.equal(metadata.title, expected, venue.id);
    assert.equal(metadata.openGraph?.title, expected, venue.id);
    assert.equal(metadata.twitter?.title, expected, venue.id);
    assert.equal(metadata.openGraph?.siteName, "ちけレポ", venue.id);
    if (count >= 20) assert.ok(metadata.description?.includes(`${count}枚掲載`), venue.id);
    else if (count >= 1) assert.ok(metadata.description?.includes("見え方写真を掲載！"), venue.id);
    else {
      assert.doesNotMatch(metadata.description ?? "", /[0-9]枚掲載/);
      assert.match(metadata.description ?? "", /随時募集中/);
    }
    assert.equal(metadata.alternates?.canonical, `https://tixrepo.com/venues/${venue.id}`);
  }
});

test("each original counts once per kind and distinct seat attachments keep their order", () => {
  const row: SeatSourceRow = {kind:"seat_view", venueId:"k-arena", eventId:null, sourceId:"2030326768037757256",
    position:"LEVEL5・16列", photoNumber:2, note:"", eventLabel:""};
  const grouped = groupSeatSources([row, {...row, photoNumber:1, position:"LEVEL3・17列"}]);
  assert.equal(grouped.seat_view.length,1);
  assert.deepEqual(grouped.seat_view[0].rows.map(item => [item.photoNumber, item.position]), [[1,"LEVEL3・17列"],[2,"LEVEL5・16列"]]);
  assert.equal(grouped.arena_map.length,0);
  const verified = `https://x.com/mzlxboop/status/${row.sourceId}`;
  assert.equal(seatSourcePermalink({...row, sourceUrl:verified}),verified);
  for (const sourceUrl of [verified+"1", verified.replace("x.com", "example.org"), verified.replace("x.com", "x.com@example.org")]) {
    assert.equal(seatSourcePermalink({...row, sourceUrl}),`https://x.com/i/web/status/${row.sourceId}`);
  }
});

test("priority venues keep their correct display names, canonical identities and searchable aliases", () => {
  const checks = [
    ["gaishi-hall", "クロコくんホール（旧：日本ガイシホール）", "クロコくんホール", "日本ガイシホール"],
    ["sapporo-dome", "札幌ドーム（大和ハウス プレミストドーム）", "大和ハウス プレミストドーム", "札幌ドーム"],
    ["k-arena", "Kアリーナ横浜", "Kアリーナ横浜", "ケーアリーナ横浜"],
    ["osaka-jo-hall", "大阪城ホール", "大阪城ホール", "城ホ"],
  ];
  for (const [id, displayName, officialName, alias] of checks) {
    const name = VENUES.find(v => v.id === id)!.name;
    const page = getVenuePageContent(id, name);
    const metadata = buildPublicVenueMetadata(id, name);
    assert.equal(page.displayName, displayName);
    assert.equal(page.officialName, officialName);
    assert.ok(page.alternateNames.includes(alias), id);
    const leadName = id === "gaishi-hall" || id === "sapporo-dome" ? displayName : `${displayName}（${alias}）`;
    assert.ok(metadata.description?.startsWith(leadName + "のライブ座席表"), id);
  }
  const toki = buildPublicVenueMetadata("toki-messe", "朱鷺メッセ");
  assert.doesNotMatch(toki.title?.toString() ?? "", /座席番号検索/);
});
