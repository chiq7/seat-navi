import type {
  ExternalSeatConfidence,
  ExternalSeatObservationDraft,
} from "./types";

const RANGE_SEPARATOR = "(?:~|〜|～|－|−|-)";

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[｜|]/g, " ")
    .replace(/[【】\[\]（）()]/g, " ")
    .replace(/[\t\u00a0]+/g, " ");
}

function numberRange(
  line: string,
  suffix: "列" | "番",
): { min: number; max: number } | null {
  const range = new RegExp(`(\\d{1,4})\\s*${RANGE_SEPARATOR}\\s*(\\d{1,4})\\s*${suffix}`, "i").exec(line);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const single = new RegExp(`(\\d{1,4})\\s*${suffix}`, "i").exec(line);
  if (!single) return null;
  const value = Number(single[1]);
  return { min: value, max: value };
}

function parseBlock(line: string): string | null {
  const patterns = [
    /(?:アリーナ(?:席)?\s*)?([A-Z])\s*[-ー]?\s*(\d{1,2})\s*ブロック/i,
    /ブロック\s*[:：]?\s*([A-Z])\s*[-ー]?\s*(\d{1,2})/i,
    /アリーナ(?:席)?\s*[:：]?\s*([A-Z])\s*[-ー]?\s*(\d{1,2})(?!\s*(?:LEVEL|GATE))/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(line);
    if (match) return `${match[1].toUpperCase()}${Number(match[2])}`;
  }
  return null;
}

function parseGate(line: string): string | null {
  const before = /(\d{1,4})\s*GATE/i.exec(line);
  if (before) return `${Number(before[1])}GATE`;
  const after = /GATE\s*(\d{1,4})/i.exec(line);
  return after ? `${Number(after[1])}GATE` : null;
}

function parseLevel(line: string): string | null {
  const before = /(\d{1,2})\s*LEVEL/i.exec(line);
  if (before) return `${Number(before[1])}LEVEL`;
  const after = /LEVEL\s*(\d{1,2})/i.exec(line);
  return after ? `${Number(after[1])}LEVEL` : null;
}

function compactSummary(parts: Array<string | null>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" / ").slice(0, 160);
}

function confidenceFor(
  block: string | null,
  row: { min: number; max: number } | null,
  seat: { min: number; max: number } | null,
): ExternalSeatConfidence {
  if (!block || !row || !seat) return "candidate";
  return row.min === row.max && seat.min === seat.max ? "exact" : "range";
}

/**
 * 貼り付け文や公開ページ本文から座席の派生事実だけを抽出する。
 * 出品者名、コメント、価格、本文そのものは返さない。
 */
export function parseExternalSeatText(input: string): ExternalSeatObservationDraft[] {
  const text = normalizeText(input);
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const observations: ExternalSeatObservationDraft[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const block = parseBlock(line);
    const gate = parseGate(line);
    const level = parseLevel(line);
    const row = numberRange(line, "列");
    const seat = numberRange(line, "番");
    if (!(block || gate || level || row || seat)) continue;

    const explicitArena = /アリーナ/i.test(line);
    const explicitStand = /(?:スタンド|LEVEL|GATE)/i.test(line);
    const seatArea = block || explicitArena ? "arena" : explicitStand ? "stand" : "unknown";
    const confidence = confidenceFor(block, row, seat);
    const summary = compactSummary([
      seatArea === "arena" ? "アリーナ" : seatArea === "stand" ? "スタンド" : "エリア未判定",
      block ? `${block}ブロック` : null,
      level,
      gate,
      row ? `${row.min}${row.min === row.max ? "" : `〜${row.max}`}列` : null,
      seat ? `${seat.min}${seat.min === seat.max ? "" : `〜${seat.max}`}番` : null,
    ]);
    const key = [seatArea, block, row?.min, row?.max, seat?.min, seat?.max, gate, level].join(":");
    if (seen.has(key)) continue;
    seen.add(key);

    observations.push({
      seat_area: seatArea,
      block,
      row_min: row?.min ?? null,
      row_max: row?.max ?? null,
      seat_min: seat?.min ?? null,
      seat_max: seat?.max ?? null,
      gate,
      level,
      confidence,
      evidence_summary: summary,
    });
  }

  return observations;
}
