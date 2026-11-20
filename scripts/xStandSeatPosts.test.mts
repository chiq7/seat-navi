import assert from "node:assert/strict";
import test from "node:test";
import { formatXStandSeatLocation, xSeatPostSources, xStandSeatPostSources } from "../src/lib/external-seats/xSeatPosts.ts";
import type { ExternalSeatObservation } from "../src/lib/external-seats/types.ts";

const now = Date.parse("2026-11-20T12:00:00Z");
const base: ExternalSeatObservation = {
  id: "1", event_id: "e1", source_type: "other", source_url: "https://x.com/i/web/status/2123367277118861368",
  observed_at: "2026-11-20T11:00:00Z", review_status: "approved", seat_area: "stand", block: null,
  row_min: 1, row_max: 1, seat_min: null, seat_max: null, gate: null, level: "LEVEL3",
  confidence: "candidate", evidence_summary: "Xの公開座席投稿",
};

test("formats stand and tier seats without inventing missing parts", () => {
  assert.equal(formatXStandSeatLocation("LEVEL3", null, null, 1, null), "LEVEL3 1列");
  assert.equal(formatXStandSeatLocation("4階", "F", "GATE29", 9, null), "4階 Fブロック GATE29 9列");
  assert.equal(formatXStandSeatLocation("LEVEL1", null, "104GATE", 23, 5), "LEVEL1 104GATE 23列 5番");
  assert.equal(formatXStandSeatLocation("バルコニー", null, null, null, null), "バルコニー");
});

test("lists only approved, current X stand posts with a level", () => {
  assert.equal(xStandSeatPostSources([base], now).length, 1);
  assert.equal(xStandSeatPostSources([{ ...base, level: null }], now).length, 0);
  assert.equal(xStandSeatPostSources([{ ...base, level: "   " }], now).length, 0);
  assert.equal(xStandSeatPostSources([{ ...base, review_status: "pending" }], now).length, 0);
  assert.equal(xStandSeatPostSources([{ ...base, source_type: "pia_resale" }], now).length, 0);
  assert.equal(xStandSeatPostSources([{ ...base, source_url: "https://cloak.pia.jp/resale/item/detail" }], now).length, 0);
  assert.equal(xStandSeatPostSources([{ ...base, seat_area: "arena" }], now).length, 0);
  // 20時間を過ぎた確認は表示しない。
  assert.equal(xStandSeatPostSources([{ ...base, observed_at: "2026-11-19T15:00:00Z" }], now).length, 0);
});

test("stand posts never enter the arena list", () => {
  assert.equal(xSeatPostSources([{ ...base, block: "F" }], now).length, 0);
});
