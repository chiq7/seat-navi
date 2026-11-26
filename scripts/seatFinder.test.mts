import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { resolveArenaView, type ArenaGuideDefinition } from "../src/components/venue/guides/arenaDefinition.ts";
import { findSeat, findSeatPlace, seatFieldKeys, seatHintIsWide, seatPlaceField, seatRowHint, type SeatFinderLevel } from "../src/components/venue/template/seatFinder.ts";
import type { StandMapData } from "../src/components/venue/template/standMap.ts";
import { kArenaLevels } from "../src/data/venueGuides/k-arena/config.ts";
import kArenaSeats from "../src/data/venueGuides/k-arena/stand-seats.json" with { type: "json" };

type SeatMap = { name: string; data: StandMapData; levels: readonly SeatFinderLevel[] };
const directory = path.resolve(import.meta.dirname, "../src/components/venue/guides/arenaData");
const maps: SeatMap[] = [{ name: "k-arena", data: kArenaSeats as unknown as StandMapData, levels: kArenaLevels }];
for (const file of readdirSync(directory).filter(name => name.endsWith(".ts"))) {
  const definition: ArenaGuideDefinition = (await import(pathToFileURL(path.join(directory, file)).href)).default;
  for (const mode of definition.modes?.options.map(option => option.id) ?? [definition.initialMode ?? "fixed"]) {
    const view = resolveArenaView(definition, mode);
    maps.push({ name: `${definition.venueId}/${mode}`, data: view.seats, levels: view.levels });
  }
}
const map = (name: string) => maps.find(item => item.name === name)!;
const seat = (name: string, place: string, row = "", number = "") => findSeat(map(name).data, map(name).levels, { place, row, number });

test("every seat map names its first box and its example finds a place", () => {
  assert.ok(maps.length >= 30);
  for (const { name, data, levels } of maps) {
    const field = seatPlaceField(data);
    assert.ok(field.label && field.hint, name);
    assert.ok(findSeatPlace(data, levels, field.hint), `${name}: 例：${field.hint}`);
    assert.notEqual(findSeat(data, levels, { place: field.hint, row: "", number: "" }).kind, "miss", name);
  }
});

test("a block name alone opens that block, with or without its noun", () => {
  for (const place of ["H", "h", "Ｈ", "Hブロック", "スタンドH"]) {
    const found = seat("osaka-jo-hall/fixed", place);
    assert.equal(found.kind, "block", place);
    if (found.kind === "block") { assert.equal(found.block.label, "H"); assert.equal(found.seat, false); }
  }
  const national = seat("mufg-stadium/fixed", "121");
  assert.equal(national.kind === "block" && national.block.label, "121ブロック");
});

test("block, row and number mark the seat in that block only", () => {
  const found = seat("osaka-jo-hall/fixed", "H", "5", "20");
  assert.equal(found.kind, "block");
  if (found.kind === "block") { assert.equal(found.block.label, "H"); assert.equal(found.seat, true); }
  // Without the block, the same row and number exist in many blocks.
  const loose = seat("osaka-jo-hall/fixed", "", "5", "20");
  assert.equal(loose.kind, "candidates");
  if (loose.kind === "candidates") assert.ok(loose.blocks.length > 5);
});

test("a known block whose numbers are not in the data still opens, never another block", () => {
  const found = seat("mufg-stadium/fixed", "121", "14", "141");
  assert.equal(found.kind, "block");
  if (found.kind === "block") assert.equal(found.block.label, "121ブロック");
});

test("doors, entrances, aisles and levels are found by their number or name", () => {
  for (const place of ["207", "207扉"]) {
    const found = seat("saitama-super-arena/arena", place);
    assert.equal(found.kind === "position" && found.position.label, "207扉", place);
  }
  for (const place of ["E13", "E13入口"]) {
    const found = seat("nissan-stadium/fixed", place);
    assert.equal(found.kind === "zone" && found.zone.label, "E13", place);
  }
  const aisle = seat("sapporo-dome/baseball", "86");
  assert.equal(aisle.kind === "position" && aisle.position.label, "86通路");
  for (const place of ["5", "LEVEL5", "level5"]) {
    const found = seat("k-arena", place);
    assert.equal(found.kind === "level" && found.level, "LEVEL5", place);
  }
});

test("a level with row and number goes to the seat on that level", () => {
  const found = seat("k-arena", "5", "10", "212");
  assert.equal(found.kind, "block");
  if (found.kind === "block") { assert.equal(found.block.id, "k-level5-34"); assert.equal(found.seat, true); }
});

test("an unknown place or an empty form is a miss, and a known place is never lost to a missing number", () => {
  assert.deepEqual(seat("osaka-jo-hall/fixed", "ZZZ"), { kind: "miss", error: "" });
  assert.deepEqual(seat("osaka-jo-hall/fixed", ""), { kind: "miss", error: "" });
  const zone = seat("nissan-stadium/fixed", "E13", "99", "9999");
  assert.equal(zone.kind === "zone" && zone.zone.label, "E13");
});

test("the row example is cut down to the row, and long place examples take their own line", () => {
  const hint = (rowSearchPlaceholder: string, rowZonePrefixes = false, compact = false) => seatRowHint({ rowSearchPlaceholder, rowZonePrefixes } as StandMapData, compact);
  assert.equal(hint("例：1 / 8 / 29"), "例：1");
  assert.equal(hint("例：A（列）"), "例：A");
  assert.equal(hint("例：G14（区画＋列）", true), "例：14");
  assert.equal(hint("例：A15 / 北5", true), "例：15");
  assert.equal(hint("ツイン：1〜4・他は空欄"), "例：1");
  // Beside the place box only one character fits.
  assert.equal(hint("例：19", false, true), "例：5");
  assert.equal(hint("例：G14（区画＋列）", true, true), "例：5");
  assert.equal(hint("例：A / N", false, true), "例：A");
  assert.equal(hint("例：8", false, true), "例：8");
  assert.equal(seatRowHint({} as StandMapData), undefined);
  assert.equal(seatHintIsWide("H"), false);
  assert.equal(seatHintIsWide("121"), false);
  assert.equal(seatHintIsWide("1階南"), false);
  assert.equal(seatHintIsWide("上段1塁側"), true);
});

test("number pads are offered only where rows are numbers and numbers carry no letter", () => {
  assert.deepEqual(seatFieldKeys(map("osaka-jo-hall/fixed").data), { row: "numeric", number: "numeric" });
  assert.equal(seatFieldKeys(map("budokan/fixed").data).row, "text");
  assert.equal(seatFieldKeys(map("vantelin-dome/fixed").data).number, "text");
});
