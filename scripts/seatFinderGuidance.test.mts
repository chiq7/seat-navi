import test from "node:test";
import assert from "node:assert/strict";
import { directionName, nearSeatNumbers, seatLevelName, seatQueryDescription } from "../src/components/venue/template/seatFinderLabels.ts";

test("seat-map labels never fall back to internal level IDs", () => {
  for (const [id, label] of Object.entries({ stand: "スタンド", fixed: "固定席", infield: "内野", outfield: "外野", upper: "上段", lower: "下段" })) {
    assert.equal(seatLevelName(id), label);
    assert.equal(seatLevelName(id, id), label);
    assert.equal(seatLevelName(id, "2階"), "2階");
  }
  assert.equal(seatLevelName("unregistered"), "座席");
});

test("direction abbreviations use the same Japanese name without changing venue IDs", () => {
  for (const left of ["レフト", "レフト側", "外野レフト側", "外野レフト"]) assert.equal(directionName(left), "外野レフト");
  for (const right of ["ライト", "ライト側", "外野ライト側", "外野ライト"]) assert.equal(directionName(right), "外野ライト");
  assert.equal(directionName("ネット裏"), directionName("バックネット側"));
  assert.equal(directionName("南西"), "南西側");
  assert.equal(directionName("北側"), "北側");
});

test("search feedback identifies both fields without duplicating Japanese suffixes", () => {
  assert.equal(seatQueryDescription({ scope: "ホーム側", row: "15", number: "481" }), "15列481番");
  assert.equal(seatQueryDescription({ scope: "北側", row: "A列", number: "４番" }), "A列４番");
  assert.equal(seatQueryDescription({ scope: "北側", block: " D22 " }), "D22");
});

test("suggestions rank only nearby confirmed seat intervals in the same printed row", () => {
  const sections = [
    { label: "far", ranges: [[1, 51]] },
    { label: "近", ranges: [[510, 515]] },
    { label: "番号なし", ranges: [] },
    { label: "近", ranges: [[505, 509]] },
    { label: "nearest", ranges: [[473, 478]] },
    { label: "重複し得る区画", ranges: [[480, 490]] },
    { label: "nearer", ranges: [[501, 503]] },
  ] as const;
  const nearby = (n: string) => nearSeatNumbers(n, sections, item => item.ranges, item => item.label).map(item => item.label);
  assert.deepEqual(nearby("４８１番"), ["nearest", "nearer", "近"]);
  assert.deepEqual(nearby("A3"), []);
  assert.deepEqual(nearby(""), []);
});
