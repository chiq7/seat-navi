import assert from "node:assert/strict";
import test from "node:test";
import { parseExternalSeatText } from "@/lib/external-seats/parser";
import { externalObservationsToArenaReports } from "@/lib/external-seats/arena";
import {
  daysUntilEventInJst,
  htmlToVisibleText,
  isAllowedOfficialResaleUrl,
  isResaleCollectionWindow,
  robotsAllowsPath,
} from "@/lib/external-seats/sourcePolicy";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";

test("LEVEL/GATEのリセール情報をアリーナと誤判定しない", () => {
  const parsed = parseExternalSeatText(`
    【LEVEL 3｜12 ~ 29列｜169 ~ 188番】
    指定席７ＬＥＶＥＬ 709GATE ２４列 223番
  `);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed.map((row) => row.seat_area), ["stand", "stand"]);
  assert.equal(parsed[1].level, "7LEVEL");
  assert.equal(parsed[1].gate, "709GATE");
});

test("全角を正規化してアリーナの範囲席を抽出する", () => {
  const [parsed] = parseExternalSeatText("【アリーナＡ３ブロック｜１２～１３列｜１６９～１７０番】");
  assert.ok(parsed);
  assert.equal(parsed.seat_area, "arena");
  assert.equal(parsed.block, "A3");
  assert.equal(parsed.row_min, 12);
  assert.equal(parsed.row_max, 13);
  assert.equal(parsed.seat_min, 169);
  assert.equal(parsed.seat_max, 170);
  assert.equal(parsed.confidence, "range");
});

test("承認済みアリーナ範囲だけを集計外セルへ展開する", () => {
  const base: ExternalSeatObservation = {
    id: "1",
    event_id: "event-1",
    source_type: "pia_resale",
    source_url: "https://cloak.pia.jp/resale/",
    observed_at: "2026-07-28T00:00:00.000Z",
    review_status: "approved",
    seat_area: "arena",
    block: "A3",
    row_min: 1,
    row_max: 2,
    seat_min: 10,
    seat_max: 11,
    gate: null,
    level: null,
    confidence: "range",
    evidence_summary: "アリーナ / A3ブロック / 1〜2列 / 10〜11番",
  };
  const cells = externalObservationsToArenaReports([
    base,
    { ...base, id: "2", seat_area: "stand" },
    { ...base, id: "3", review_status: "pending" },
  ]);
  assert.equal(cells.length, 4);
  assert.ok(cells.every((cell) => cell.sourceKind === "external"));
  assert.ok(cells.every((cell) => cell.externalConfidence === "range"));
});

test("定期取得は明示した公式リセールドメインだけを許可する", () => {
  assert.equal(isAllowedOfficialResaleUrl("https://cloak.pia.jp/resale/item/detail"), true);
  assert.equal(isAllowedOfficialResaleUrl("https://t.pia.jp/guide/resale.jsp"), true);
  assert.equal(isAllowedOfficialResaleUrl("https://ticketjam.jp/tickets/example"), false);
  assert.equal(isAllowedOfficialResaleUrl("http://cloak.pia.jp/resale/item/detail"), false);
});

test("HTMLから本文だけを抽出しscriptを捨てる", () => {
  const text = htmlToVisibleText("<p>アリーナA3ブロック 2列 10番</p><script>secret()</script>");
  assert.match(text, /アリーナA3ブロック/);
  assert.doesNotMatch(text, /secret/);
});

test("robots.txtは最長一致のAllowを優先する", () => {
  const robots = `
    User-agent: *
    Disallow: /resale/
    Allow: /resale/public/
  `;
  assert.equal(robotsAllowsPath(robots, "https://example.com/resale/private/", "TixRepoSeatFactsBot"), false);
  assert.equal(robotsAllowsPath(robots, "https://example.com/resale/public/list", "TixRepoSeatFactsBot"), true);
});

test("リセール巡回は公演の5〜3日前だけに絞る", () => {
  const now = new Date("2026-07-28T00:00:00.000Z"); // JST 7/28 09:00
  assert.equal(daysUntilEventInJst("2026-08-02", now), 5);
  assert.equal(isResaleCollectionWindow("2026-08-02", now), true);
  assert.equal(isResaleCollectionWindow("2026-07-31", now), true);
  assert.equal(isResaleCollectionWindow("2026-07-30", now), false);
  assert.equal(isResaleCollectionWindow("2026-08-03", now), false);
});
