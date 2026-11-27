import { normalizeSeatNumber } from "@/lib/kyoceraSeatLookup";
import { kyoceraMatchesArea, type DrawingBlock } from "./kyoceraMapDrawing";

export type KyoceraTicketInput = { row: string; number: string };
export type KyoceraSeatCandidate = KyoceraTicketInput & { block: DrawingBlock; range: { start: number; end: number } };

export function normalizeKyoceraTicket(rowText: string, numberText: string): KyoceraTicketInput | null {
  const value = rowText.normalize("NFKC").trim().toUpperCase().replace(/列$/, "").trim();
  const row = /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? String(Number(value)) : /^[A-Z]$/.test(value) ? value : null;
  const number = normalizeSeatNumber(numberText.normalize("NFKC").trim().replace(/番$/, "").trim());
  return row !== null && number ? { row, number } : null;
}

export function findKyoceraSeats(blocks: readonly DrawingBlock[], whole: readonly number[], input: KyoceraTicketInput, direction = "all", tier = "すべて"): KyoceraSeatCandidate[] {
  const candidates = new Map<string, KyoceraSeatCandidate>();
  for (const block of blocks) {
    if (!kyoceraMatchesArea(block, whole, direction, tier)) continue;
    if (block.code === "X_BM_57" && input.row === "27" && input.number === "46") continue;
    const row = block.rows.find(row => row.row === input.row);
    const range = row?.ranges.find(range => Number(input.number) >= range.start && Number(input.number) <= range.end);
    if (range) candidates.set(`${block.areaId}:${block.code}`, { ...input, block, range });
  }
  return [...candidates.values()].sort((a, b) => a.block.x - b.block.x || a.block.y - b.block.y || a.block.code.localeCompare(b.block.code));
}

/** The first box of the ticket form: an aisle ("12", "12通路"), a block name ("中央A", "FA", "1塁側") or a block's code. */
export function findKyoceraPlace(blocks: readonly DrawingBlock[], whole: readonly number[], text: string, direction = "all", tier = "すべて"): DrawingBlock[] {
  const normalize = (name: string) => name.normalize("NFKC").toUpperCase().replace(/\s+/g, "").replace(/(?:番?通路|ブロック|区画)$/, "");
  const name = normalize(text);
  if (!name) return [];
  return blocks.filter(block => kyoceraMatchesArea(block, whole, direction, tier)
    && [block.label, block.code, ...block.label.split("・"), ...block.passages].some(alias => normalize(alias) === name));
}

export type KyoceraFinderResult =
  /** The seat itself, in one block. */
  | { kind: "seat"; candidate: KyoceraSeatCandidate }
  /** The same row and number in more than one block. */
  | { kind: "seats"; candidates: KyoceraSeatCandidate[] }
  | { kind: "block"; block: DrawingBlock }
  /** Several blocks share the place (the blocks along an aisle, a whole side). */
  | { kind: "area"; blocks: DrawingBlock[] }
  /** "ticket": a row or number was typed but not both. "nothing": every box is empty. */
  | { kind: "miss"; reason: "place" | "seat" | "ticket" | "nothing" };

/**
 * The ticket in one line: any box may be left empty. The aisle alone opens its blocks, the row and number alone
 * find the seat, and all three pick the block of that aisle that has the seat. A known aisle whose row or number
 * is not in the data still opens: the place is shown, the seat is not guessed.
 */
export function findKyoceraTicket(blocks: readonly DrawingBlock[], whole: readonly number[], input: { place: string; row: string; number: string }, direction = "all", tier = "すべて"): KyoceraFinderResult {
  const ticket = normalizeKyoceraTicket(input.row, input.number);
  if (!input.place.trim()) {
    if (!ticket) return { kind: "miss", reason: input.row.trim() || input.number.trim() ? "ticket" : "nothing" };
    const hits = findKyoceraSeats(blocks, whole, ticket, direction, tier);
    return hits.length === 1 ? { kind: "seat", candidate: hits[0] } : hits.length ? { kind: "seats", candidates: hits } : { kind: "miss", reason: "seat" };
  }
  const here = findKyoceraPlace(blocks, whole, input.place, direction, tier);
  if (!here.length) return { kind: "miss", reason: "place" };
  const seated = ticket ? findKyoceraSeats(here, whole, ticket) : [];
  if (seated.length === 1) return { kind: "seat", candidate: seated[0] };
  if (seated.length > 1) return { kind: "seats", candidates: seated };
  return here.length === 1 ? { kind: "block", block: here[0] } : { kind: "area", blocks: here };
}
