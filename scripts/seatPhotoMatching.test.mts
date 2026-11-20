import assert from "node:assert/strict";
import test from "node:test";
import fixedCatalog from "@/data/seatViewPosts.json";
import arenaCatalog from "@/data/eventArenaPhotos.json";
import { getEventArenaPhotoLayout } from "@/lib/eventArenaPhotos";
import { seatViewInlinePhotoUrl, seatViewPhotoSourceUrl, seatViewSingleImageEmbedUrl } from "@/lib/seatViewPhotoAssets";
import { seatViewMatchesForSelection, seatViewPosts } from "@/lib/seatViewPosts";

const asset = (record: Parameters<typeof seatViewInlinePhotoUrl>[0]) =>
  new URL(seatViewInlinePhotoUrl(record)!).pathname.split("/").at(-1);

test("a failed direct image can embed only a reviewed, confirmed single-image post", () => {
  const single = { url: "https://x.com/tyottomattenaa/status/1729000916052001133" };
  assert.equal(new URL(seatViewSingleImageEmbedUrl(single)!).searchParams.get("id"), "1729000916052001133");
  assert.equal(seatViewSingleImageEmbedUrl({ ...single, photo: 2 }), undefined);
  const multiple = { url: "https://x.com/wonpnsl/status/2100093473504567738", photo: 3 };
  assert.ok(seatViewInlinePhotoUrl(multiple));
  assert.equal(seatViewSingleImageEmbedUrl(multiple), undefined);
});

test("different locations in the same Tokyo Dome post resolve to different exact photos", () => {
  const posts = seatViewPosts("tokyo-dome-fixed");
  for (const [section, row, photo, id] of [
    ["A42", "13", 3, "HSUH4bcaYAABaGs"],
    ["B08", "34", 4, "HSUH4bbbIAAmRc4"],
  ] as const) {
    const matches = seatViewMatchesForSelection(posts, { diagram: "tokyo-dome-fixed", request: 1, section, row, seat: "341" });
    assert.ok(matches.length);
    assert.ok(matches.every(match => match.label === "同じ座席"));
    const match = matches.find(({ post }) => post.url.endsWith("/2100093473504567738"));
    assert.equal(match?.post.photo, photo);
    assert.equal(asset(match!.post), id);
    assert.ok(seatViewPhotoSourceUrl(match!.post)?.endsWith(`/photo/${photo}`));
  }
});

test("assigns the two PIA photos to the right rows and retains two lenses of the same seat", () => {
  const posts = seatViewPosts("pia-arena-mm-seat-plans");
  const differentRows = posts.filter(post => post.url.endsWith("/1496727885222006785"));
  assert.deepEqual(differentRows.map(post => [post.row, post.photo, asset(post)]), [
    ["1", 2, "FMVyEwGVUAA2zSo"], ["4", 1, "FMVyERPVIAEASZE"],
  ]);
  const sameSeat = seatViewMatchesForSelection(posts, {
    diagram: "pia-arena-mm-seat-plans", request: 1, section: "2F-L-060", row: "7", seat: "60",
  }).filter(({ post }) => post.url.endsWith("/2070498381492027771"));
  assert.deepEqual(sameSeat.map(({ post }) => [post.photo, asset(post)]), [
    [1, "HLvjTYPbEAARe-I"], [2, "HLvjTYSbAAAbcED"],
  ]);
});

test("excludes a Yokohama post whose first image contradicts the seat and whose other images are unconfirmed", () => {
  assert.ok(fixedCatalog["ya-common-bowl-current"].some(post => post.url.endsWith("/2012169427442135262")));
  assert.ok(!seatViewPosts("ya-common-bowl-current").some(post => post.url.endsWith("/2012169427442135262")));
});

test("retains mixed-media numbering; a video must not stand in for a photo", () => {
  const posts = seatViewPosts("paypay-stand-reference").filter(post => post.url.endsWith("/1998768627861065900"));
  assert.deepEqual(posts.map(post => [post.row, post.photo, asset(post)]).sort(), [
    ["22", 4, "G70Na7KaMAgbv0t"], ["33", 2, "G70Na7MaIAAkKpg"], ["38", 3, "G70Na7Lb0AAIro5"],
  ]);
  assert.equal(seatViewInlinePhotoUrl({ url: posts[0].url, photo: 1 }), undefined);
});

test("withholds only the attachments that are pending review", () => {
  const rows = seatViewPosts("osaka-stand-current").filter(post => post.url.endsWith("/2096908702125326663"));
  assert.deepEqual(rows.map(post => post.photo), [3, 4]);
});

test("Nissan W14 and W23 show both reviewed stills and exclude the video", () => {
  const posts = seatViewPosts("nissan-seats");
  for (const [id, zone, row, images] of [
    ["1886742645038571589", "W14", "9", ["Gi8OYmwagAAhrTH", "Gi8OYmyb0AAsKPc"]],
    ["1816655100179546393", "W23", "24", ["GTYOHqvagAMOXJ3", "GTYOHqwagAM7sNN"]],
  ] as const) {
    const matches = seatViewMatchesForSelection(posts, { diagram: "nissan-seats", request: 1, zone, row })
      .filter(({ post }) => post.url.endsWith(`/${id}`));
    assert.deepEqual(matches.map(({ post }) => [post.photo, post.row, asset(post)]),
      images.map((image, index) => [index + 1, row, image]));
    assert.ok(matches.every(({ label }) => label === "同じ入口付近の参考"));
  }
});

test("rejects an arena image assigned to conflicting positions even in the same block", () => {
  const id = "abed7e8d055a8de80270";
  const layout = arenaCatalog[id];
  const event = { id, date: layout.date, venue_id: layout.venueId };
  assert.equal(getEventArenaPhotoLayout(event)?.photos.length, 1);
  assert.equal(getEventArenaPhotoLayout({ ...event, date: "2026-10-26" }), null);
  assert.equal(getEventArenaPhotoLayout(event, {
    [id]: { ...layout, photos: [...layout.photos, { ...layout.photos[0], row: "13" }] },
  }), null);
});
