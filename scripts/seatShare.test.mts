import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ogImages from "../src/data/ogImages.json" with { type: "json" };
import { cleanSeatPart, seatShareImage, seatSharePath, seatShareTarget, seatShareText, venueShareImage } from "../src/lib/seatShare.ts";
import { seatSharePage } from "../src/lib/seatSharePage.ts";
import { parseVenueSeatLink } from "../src/lib/venueSeatLinks.ts";
import { buildPublicVenueMetadata } from "../src/lib/venuePageMetadata.ts";

const root = path.resolve(import.meta.dirname, "..");

test("ticket row and number keep only short letters and digits", () => {
  assert.equal(cleanSeatPart("１０"), "10");
  assert.equal(cleanSeatPart(" A3 "), "A3");
  assert.equal(cleanSeatPart("<b>"), undefined);
  assert.equal(cleanSeatPart("1234567"), undefined);
  assert.equal(cleanSeatPart(null), undefined);
});

test("a seat link goes through /s/ and lands full screen on that block, row and number", () => {
  const share = { venue: "k-arena", section: "k-level5-34", row: "10", number: "212" };
  assert.equal(seatSharePath(share), "/s/k-arena/k-level5-34?r=10&n=212");
  assert.equal(seatShareTarget(share), "/venues/k-arena?seatMode=fixed&seatSection=k-level5-34&seatOpen=1&seatRow=10&seatNumber=212#venue-seat-guide");
  assert.equal(seatShareText("Kアリーナ横浜", "LEVEL5・193番〜", "10", "212"), "Kアリーナ横浜 LEVEL5・193番〜 10列212番の席はここ｜ちけレポ");
  assert.deepEqual(parseVenueSeatLink({ seatMode: "fixed", seatSection: "k-level5-34", seatOpen: "1", seatRow: "10", seatNumber: "212" }),
    { mode: "fixed", section: "k-level5-34", row: "10", number: "212", open: true });
  assert.deepEqual(parseVenueSeatLink({ seatSection: "k-level5-34", seatRow: "<x>" }), { mode: "fixed", section: "k-level5-34" });
});

test("the share page shows that block's name and picture, escapes input and keeps the share tags", () => {
  const page = seatSharePage("k-arena", "k-level5-34", new URLSearchParams("r=10&n=212&utm_source=line&utm_medium=social&utm_campaign=seat_share&x=<script>"));
  assert.equal(page.status, 200);
  if (page.status !== 200) return;
  assert.match(page.html, /<meta property="og:title" content="Kアリーナ横浜 LEVEL5・193番〜 10列212番の席はここ｜ちけレポ">/);
  assert.match(page.html, /og:image" content="https:\/\/tixrepo\.com\/og\/seats\/k-arena\/k-level5-34\.jpg\?v=/);
  assert.match(page.html, /noindex/);
  assert.match(page.html, /seatSection=k-level5-34&amp;seatOpen=1&amp;seatRow=10&amp;seatNumber=212&amp;utm_source=line/);
  assert.doesNotMatch(page.html, /<script>[^l]/);
  assert.deepEqual(seatSharePage("k-arena", "no-such-block", new URLSearchParams()), { status: 302, location: "/venues/k-arena" });
  assert.deepEqual(seatSharePage("not-a-venue", "x", new URLSearchParams()), { status: 404 });
});

test("every listed share picture exists, and venue pages use their own picture", () => {
  for (const venue of ogImages.venues) assert.ok(existsSync(path.join(root, "public/og/venues", `${venue}.jpg`)), venue);
  for (const [venue, sections] of Object.entries(ogImages.seats)) for (const section of sections) {
    assert.ok(existsSync(path.join(root, "public/og/seats", venue, `${section}.jpg`)), section);
  }
  assert.equal(venueShareImage("k-arena"), `/og/venues/k-arena.jpg?v=${ogImages.version}`);
  assert.equal(seatShareImage("k-arena", "unknown"), venueShareImage("k-arena"));
  const metadata = buildPublicVenueMetadata("k-arena", "Kアリーナ横浜");
  assert.match(String((metadata.openGraph?.images as { url: string }[])[0].url), /\/og\/venues\/k-arena\.jpg/);
});

test("a seat sits on its row line, spaced evenly from the row's first number", async () => {
  const { seatOnSegment, blockRowGap } = await import("../src/components/venue/template/seatLabels.ts");
  const segment = { start: 79, end: 98, a: [0, 0], b: [100, 0] };
  assert.deepEqual(seatOnSegment(segment, 79).map(Math.round), [3, 0]);
  assert.deepEqual(seatOnSegment(segment, 98).map(Math.round), [98, 0]);
  assert.ok(Math.abs(seatOnSegment(segment, 93)[0] - 72.5) < .01);
  // A bent row: the seat follows the drawn line from the first-number end.
  const bent = { start: 1, end: 4, a: [0, 0], b: [10, 10], points: [[10, 10], [10, 0], [0, 0]] };
  assert.deepEqual(seatOnSegment(bent, 1).map(n => Math.round(n * 10) / 10), [2.5, 0]);
  const block = { rows: [{ label: "1", segments: [{ start: 1, end: 9, a: [0, 0], b: [10, 0] }] }, { label: "2", segments: [{ start: 1, end: 9, a: [0, 4], b: [10, 4] }] }] };
  assert.equal(blockRowGap(block as never), 4);
});

test("Tokyo Dome and Kyocera Dome blocks can be sent: the share page names the block and opens the fixed seat map", () => {
  const tokyo = seatSharePage("tokyo-dome", "A20", new URLSearchParams("r=10&n=12"));
  assert.equal(tokyo.status, 200);
  if (tokyo.status === 200) {
    assert.match(tokyo.html, /<meta property="og:title" content="東京ドーム 1階 前方・A20 10列12番の席はここ｜ちけレポ">/);
    assert.match(tokyo.html, /\/venues\/tokyo-dome\?seatMode=fixed&amp;seatSection=A20&amp;seatOpen=1&amp;seatRow=10&amp;seatNumber=12/);
    // No picture is drawn for the domes yet: the site's own picture stands in.
    assert.match(tokyo.html, /og:image" content="https:\/\/tixrepo\.com\/opengraph-image/);
  }
  const kyocera = seatSharePage("kyocera-dome", "X_BM_07", new URLSearchParams());
  assert.equal(kyocera.status, 200);
  if (kyocera.status === 200) {
    assert.match(kyocera.html, /京セラドーム大阪 1塁側・下段・8通路・B〜P列・161〜169番の席はここ/);
    assert.match(kyocera.html, /seatSection=X_BM_07&amp;seatOpen=1/);
  }
  assert.deepEqual(seatSharePage("kyocera-dome", "no-such-block", new URLSearchParams()), { status: 302, location: "/venues/kyocera-dome" });
});
