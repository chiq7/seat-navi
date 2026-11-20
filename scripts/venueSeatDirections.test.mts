import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { searchStandSeats, type StandMapData } from "../src/components/venue/template/standMap.ts";
import { kyoceraDomeGuide } from "../src/data/venueGuides/kyocera-dome/index.ts";
import { kyoceraDrawingBlocks } from "../src/components/venue/guides/kyoceraMapDrawing.ts";
import { findKyoceraSeats } from "../src/components/venue/guides/kyoceraSeatSearch.ts";
import { findTokyoDomeVerifiedSeats } from "../src/lib/tokyoDomeSeatLocator.ts";
import { TOKYO_DOME_VERIFIED_SEAT_BLOCKS, TOKYO_DOME_REPRESENTATIVE_SEAT_BLOCKS } from "../src/data/tokyoDomeVerifiedSeatRows.ts";

// venue, diagram, block, printed row, printed seat, correct direction, rejected direction.
// These are fixed regression inputs from the registered diagrams, independent of the search result.
const tickets = [
  ["ariake-arena", "ariake-fixed-stand", "ariake-B-01", "16", "1", "B", "A"],
  ["belluna-dome", "belluna-seats", "belluna-shape-344", "6", "31", "ネット裏", "1塁内野"],
  ["budokan", "budokan-reference-stands", "budokan-1F-東-0-0", "C", "5", "東", "北"],
  ["edion-arena", "edion-fixed-seats", "edion-b-1", "A", "31", "B", "A"],
  ["gaishi-hall", "gaishi-fixed", "gaishi-F-stand-20", "14", "28", "西", "北"],
  ["gaishi-hall", "gaishi-bleacher", "gaishi-F-stand-20", "14", "28", "西", "北"],
  ["hiroshima-arena", "hiroshima-stand", "hiroshima-g-front-4", "12", "1", "G", "F"],
  ["k-arena", "k-arena-permanent-stands", "k-level3-10", "1", "208", "right", "center"],
  ["koshien", "koshien-seats", "koshien-reference-34", "1", "344", "レフト", "ライト"],
  ["makuhari-messe", "makuhari-seats", "makuhari-f2-b-1", "2", "21", "B", "A"],
  ["marine-messe", "marine-concert", "marine-F-inner-1", "6", "6", "西", "南"],
  ["marine-messe", "marine-center", "marine-F-inner-1", "6", "6", "西", "南"],
  ["miyagi-arena", "miyagi-stand", "miyagi-b-front-1", "1", "1", "B", "A"],
  ["mufg-stadium", "mufg-seats", "mufg-block-120", "1", "138", "南サイドスタンド", "メインスタンド"],
  ["nissan-stadium", "nissan-seats", "nissan-n23-2", "1", "201", "北サイドスタンド", "バックスタンド"],
  ["osaka-jo-hall", "osaka-stand-current", "B", "4", "21", "BCD", "AN"],
  ["paypay-dome", "paypay-stand-reference", "paypay-front-20", "1", "221", "1塁側", "3塁側"],
  ["pia-arena-mm", "pia-arena-mm-seat-plans", "2F-C-131", "1", "139", "C", "L"],
  ["sapporo-dome", "sapporo-baseball", "sapporo-baseball-12", "19", "101", "北側", "東側"],
  ["sapporo-dome", "sapporo-soccer", "sapporo-soccer-166", "19", "1", "東側", "西側"],
  ["tokyo-garden-theater", "tokyo-garden-theater-seat-plans", "1B-front", "2", "14", "B", "A"],
  ["vantelin-dome", "vantelin-prime-unfolded", "vantelin-prime-twin-R-1", "1", "R1", "1塁側", "3塁側"],
  ["vantelin-dome", "vantelin-seat-reference", "vantelin-number-L-1", "25", "L1", "バックネット側", "ライト側"],
  ["yokohama-arena", "ya-common-bowl-current", "B-front-1", "1", "2", "BC", "AD"],
  ["yoyogi", "yoyogi-stand-reference", "yoyogi-s1A-1", "8", "27", "南", "北"],
  ["zozo-marine", "zozo-seats", "zozo-reference-677", "42", "266", "3塁側", "ライト"],
] as const;

const nonDirectional = ["ssa-seat-arena", "ssa-seat-stadium"];
const unnumbered = ["toki-seats-exhibition", "toki-seats-main"];
const root = path.resolve(import.meta.dirname, "../src/data/venueGuides");
const maps = new Map<string, { venue: string; data: StandMapData }>();

function collectMaps(venue: string, value: unknown) {
  if (!value || typeof value !== "object") return;
  if ("diagramId" in value && "blocks" in value && Array.isArray(value.blocks) &&
      value.blocks.length && value.blocks.every(block => block.path && Array.isArray(block.rows))) {
    const data = value as StandMapData;
    assert.ok(!maps.has(data.diagramId), `duplicate diagram: ${data.diagramId}`);
    maps.set(data.diagramId, {venue, data});
    return;
  }
  for (const child of Object.values(value)) collectMaps(venue, child);
}

for (const entry of readdirSync(root, {withFileTypes: true}).filter(entry => entry.isDirectory())) {
  const directory = path.join(root, entry.name);
  for (const filename of readdirSync(directory).filter(name => name.endsWith(".json"))) {
    collectMaps(entry.name, JSON.parse(readFileSync(path.join(directory, filename), "utf8").replace(/^\uFEFF/, "")));
  }
}

test("each registered common seat diagram has a direction fixture or a verified capability exception", () => {
  assert.deepEqual([...maps.keys()].sort(), [...tickets.map(ticket => ticket[1]), ...nonDirectional, ...unnumbered].sort());
});

for (const [venue, diagram, block, row, number, correct, other] of tickets) {
  test(`${venue} / ${diagram}: ${row}列${number}番 in ${correct}, not ${other}`, () => {
    const entry = maps.get(diagram);
    assert.equal(entry?.venue, venue);
    const seat = entry!.data;
    const matches = searchStandSeats(seat, "all", correct, row, number);
    assert.ok(matches.matches.some(candidate => candidate.id === block));
    assert.ok(matches.matches.every(candidate => candidate.area === correct));
    const miss = searchStandSeats(seat, "all", other, row, number);
    assert.equal(miss.matches.length, 0);
    assert.ok(!miss.zone && !miss.position && miss.error);
  });
}

for (const diagram of nonDirectional) {
  test(`${diagram}: no directional selector is supported by this map`, () => {
    const entry = maps.get(diagram)!;
    assert.equal(entry.venue, "saitama-super-arena");
    assert.deepEqual([...new Set(entry.data.blocks.map(block => block.area))], ["all"]);
  });
}

for (const diagram of unnumbered) {
  test(`${diagram}: an unverified number cannot resolve to a numbered seat`, () => {
    const entry = maps.get(diagram)!;
    assert.equal(entry.venue, "toki-messe");
    assert.ok(entry.data.blocks.every(block => block.numberLookup === "unavailable" || block.rows.every(row => !row.segments.length)));
    for (const area of new Set(entry.data.blocks.map(block => block.area))) {
      const result = searchStandSeats(entry.data, "all", area, "15", "481");
      assert.ok(!result.matches.length && !result.zone && !result.position);
    }
  });
}

test("Tokyo Dome: 15列481番 belongs to A01 on first side, never home or third", () => {
  for (const side of ["first", "all"] as const)
    assert.deepEqual(findTokyoDomeVerifiedSeats(15, 481, "all", side).map(block => block.code), ["A01"]);
  for (const side of ["home", "third"] as const)
    assert.deepEqual(findTokyoDomeVerifiedSeats(15, 481, "all", side), []);
});

test("Tokyo Dome: each registered range boundary matches only within the requested side", () => {
  for (const block of [...TOKYO_DOME_VERIFIED_SEAT_BLOCKS, ...TOKYO_DOME_REPRESENTATIVE_SEAT_BLOCKS]) {
    for (const row of block.rows) for (const interval of row.intervals) for (const number of new Set(interval)) {
      const unrestricted = findTokyoDomeVerifiedSeats(row.row, number, block.level);
      assert.ok(unrestricted.some(found => found.code === block.code));
      for (const side of ["first", "home", "third"] as const) {
        assert.deepEqual(findTokyoDomeVerifiedSeats(row.row, number, block.level, side), unrestricted.filter(candidate => candidate.area === side));
      }
    }
  }
});

test("Kyocera Dome: 7列481番 resolves to X_TP_61 on the first side only", () => {
  const blocks = kyoceraDrawingBlocks(kyoceraDomeGuide);
  const ticket = {row: "7", number: "481"};
  const viewBox = kyoceraDomeGuide.seatMap.viewBox;
  assert.deepEqual(findKyoceraSeats(blocks, viewBox, ticket, "first").map(candidate => candidate.block.code), ["X_TP_61"]);
  assert.deepEqual(findKyoceraSeats(blocks, viewBox, ticket, "third"), []);
});

