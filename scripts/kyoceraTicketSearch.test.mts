import assert from "node:assert/strict";
import test from "node:test";
import { kyoceraDrawingBlocks } from "../src/components/venue/guides/kyoceraMapDrawing.ts";
import { findKyoceraPlace, findKyoceraTicket } from "../src/components/venue/guides/kyoceraSeatSearch.ts";
import { kyoceraDomeGuide } from "../src/data/venueGuides/kyocera-dome/index.ts";

const whole = kyoceraDomeGuide.seatMap!.viewBox;
const blocks = kyoceraDrawingBlocks(kyoceraDomeGuide);
const find = (place: string, row = "", number = "") => findKyoceraTicket(blocks, whole, { place, row, number });

test("the aisle is read as the ticket prints it", () => {
  const plain = findKyoceraPlace(blocks, whole, "12").map(block => block.code);
  assert.ok(plain.length > 1 && plain.includes("A_BM_01"));
  for (const written of ["12通路", "１２通路", "12番通路", " 12 "]) assert.deepEqual(findKyoceraPlace(blocks, whole, written).map(block => block.code), plain, written);
  assert.deepEqual(findKyoceraPlace(blocks, whole, ""), []);
  assert.deepEqual(findKyoceraPlace(blocks, whole, "999"), []);
});

test("an aisle alone opens its blocks; a block's own code opens that block", () => {
  const aisle = find("12");
  assert.equal(aisle.kind, "area");
  assert.ok(aisle.kind === "area" && aisle.blocks.every(block => block.passages.includes("12")));
  const one = find("A_BM_01");
  assert.ok(one.kind === "block" && one.block.code === "A_BM_01");
  // A name shared by many blocks (a block name, a seat kind, a whole side) is an area too.
  for (const name of ["中央A", "FA", "1塁側"]) assert.equal(find(name).kind, "area", name);
});

test("aisle, row and number pick the block of that aisle that has the seat", () => {
  // 中央A, rows 1-4, seats 1-8, beside aisle 12.
  const seat = find("12", "1", "5");
  assert.ok(seat.kind === "seat" && seat.candidate.block.code === "A_BM_01" && seat.candidate.row === "1" && seat.candidate.number === "5");
  assert.ok(find("12通路", "1列", "5番").kind === "seat");
  // Without the aisle the same row and number is looked for in the whole venue, and that block is among the answers.
  const anywhere = find("", "1", "5");
  assert.ok(anywhere.kind === "seat" ? anywhere.candidate.block.code === "A_BM_01" : anywhere.kind === "seats" && anywhere.candidates.some(c => c.block.code === "A_BM_01"));
});

test("a known aisle whose row or number is not in the data still opens: the place is shown, the seat is not guessed", () => {
  const shown = find("12", "99", "999");
  assert.equal(shown.kind, "area");
  // A row without a number says nothing about the seat: the aisle alone is used.
  assert.equal(find("12", "1", "").kind, "area");
});

test("what cannot be found says why", () => {
  assert.deepEqual(find(""), { kind: "miss", reason: "nothing" });
  assert.deepEqual(find("", "1", ""), { kind: "miss", reason: "ticket" });
  assert.deepEqual(find("", "", "5"), { kind: "miss", reason: "ticket" });
  assert.deepEqual(find("999"), { kind: "miss", reason: "place" });
  assert.deepEqual(find("", "99", "9999"), { kind: "miss", reason: "seat" });
});

test("every aisle and every block name of the data is found", () => {
  const names = new Set(blocks.flatMap(block => [block.label, ...block.passages]));
  for (const name of names) assert.ok(findKyoceraPlace(blocks, whole, name).length > 0, name);
});
