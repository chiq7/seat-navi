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
