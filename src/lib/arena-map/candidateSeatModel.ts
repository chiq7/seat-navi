import { containsPoint, layoutSeats, normalizeLabel, type ArenaLayout, type Point, type SeatAddress } from "./layoutModel";

export type NumberingRule = { kind: "preserved" | "row-reset" | "block-continuous"; start: number; direction: 1 | -1 };
export const numberingRules: NumberingRule[] = [
  { kind: "preserved", start: 1, direction: 1 },
  { kind: "row-reset", start: 1, direction: 1 },
];
export const rowKey = (a: Pick<SeatAddress, "block" | "row">) => JSON.stringify([normalizeLabel(a.block), normalizeLabel(a.row)]);
export const seatKey = (a: SeatAddress) => JSON.stringify([normalizeLabel(a.block), normalizeLabel(a.row), String(Number(normalizeLabel(a.seat)))]);
export type CandidateSeat = { address: SeatAddress; point: Point };
export type CandidateRow = {
  key: string; block: string; row: string; center: Point; direction: Point;
  seats: CandidateSeat[]; potentialNumbers: number[];
};
export type SeatCandidate = {
  id: string; shapeId: string; layout: ArenaLayout; numbering: NumberingRule;
  seats: CandidateSeat[]; rows: CandidateRow[]; byLabel: Map<string, CandidateSeat[]>;
};

// Potential positions depend on authored blocks, not on the proposed stage.
// A WeakMap retains no reports and does not prolong the lifetime of a preview grid.
const potentialCache = new WeakMap<ArenaLayout["blocks"], Map<string, CandidateSeat[]>>();
const blockPotentialCache = new WeakMap<ArenaLayout["blocks"][number], Map<string, CandidateSeat[]>>();
function potentialRows(layout: ArenaLayout, addresses?: readonly SeatAddress[]) {
  if (addresses) {
    const labels = new Set(addresses.map(a => normalizeLabel(a.block)));
    const result = new Map<string, CandidateSeat[]>();
    for (const block of layout.blocks) {
      if (![block.id, ...(block.aliases ?? [])].some(alias => labels.has(normalizeLabel(alias)))) continue;
      let rows = blockPotentialCache.get(block);
      if (!rows) {
        rows = new Map();
        for (const seat of layoutSeats({ ...layout, blocks: [block] }, 25000)) {
          const key = rowKey(seat.address), values = rows.get(key) ?? [];
          values.push(seat); rows.set(key, values);
        }
        blockPotentialCache.set(block, rows);
      }
      for (const [key, values] of rows) result.set(key, [...(result.get(key) ?? []), ...values]);
    }
    return result;
  }
  const cached = potentialCache.get(layout.blocks);
  if (cached) return cached;
  const grouped = new Map<string, CandidateSeat[]>();
  for (const seat of layoutSeats(layout, 25000)) {
    const key = rowKey(seat.address);
    const values = grouped.get(key) ?? [];
    values.push(seat); grouped.set(key, values);
  }
  potentialCache.set(layout.blocks, grouped);
  return grouped;
}

/** Finite hypotheses over an authored grid. No report or oracle is accepted here. */
export function generateCandidateSeats(layout: ArenaLayout, numbering: NumberingRule, indexAddresses?: readonly SeatAddress[], observedOnly = false): SeatCandidate {
  if (!Number.isInteger(numbering.start) || numbering.start < 1 || ![1, -1].includes(numbering.direction)) throw new Error("Unsupported numbering rule");
  const potential = potentialRows(layout, observedOnly ? indexAddresses ?? [] : undefined);
  const rows: CandidateRow[] = [];
  for (const block of layout.blocks) {
    const aliases = new Set([block.id, ...(block.aliases ?? [])].map(normalizeLabel));
    const observedRows = observedOnly ? new Set((indexAddresses ?? []).filter(a => aliases.has(normalizeLabel(a.block))).map(a => normalizeLabel(a.row))) : null;
    if (observedRows && !observedRows.size) continue;
    let blockNext = numbering.start;
    for (const row of block.rows) {
      if (observedRows && !observedRows.has(normalizeLabel(row.label)) && numbering.kind !== "block-continuous") continue;
      const slots = [...(potential.get(rowKey({ block: block.id, row: row.label })) ?? [])]
        .sort((a, b) => (Number(a.address.seat) - Number(b.address.seat)) * numbering.direction);
      if (!slots.length) continue;
      const first = slots[0].point, last = slots.at(-1)!.point;
      const length = Math.hypot(last.x - first.x, last.y - first.y) || 1;
      const kept = slots.filter(s => !layout.landmarks.some(l => containsPoint(l.shape, s.point)));
      if (observedRows && !observedRows.has(normalizeLabel(row.label))) { blockNext += kept.length; continue; }
      const seats = kept.map((s, i) => ({ point: { ...s.point }, address: { ...s.address,
        seat: String(numbering.kind === "block-continuous" ? blockNext + i : numbering.kind === "row-reset" ? numbering.start + i : numbering.start + (numbering.direction === 1 ? Number(s.address.seat) - 1 : Number(slots[0].address.seat) - Number(s.address.seat))),
      } }));
      if (seats.some(s => Number(s.address.seat) > 10000)) throw new Error("Numbering exceeds supported range");
      rows.push({ key: rowKey({ block: block.id, row: row.label }), block: block.id, row: row.label,
        center: { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 },
        direction: { x: (last.x - first.x) / length, y: (last.y - first.y) / length }, seats,
        potentialNumbers: slots.map(s => numbering.start + (numbering.direction === 1 ? Number(s.address.seat) - 1 : Number(slots[0].address.seat) - Number(s.address.seat))),
      });
      blockNext += kept.length;
    }
  }
  const seats = rows.flatMap(r => r.seats), byLabel = new Map<string, CandidateSeat[]>();
  const blockAliases = new Map(layout.blocks.map(block => [block.id, [...new Set([block.id, ...(block.aliases ?? [])].map(normalizeLabel))]]));
  const queries = indexAddresses ? new Map<string, Set<number>>() : null;
  for (const address of indexAddresses ?? []) {
    const key = rowKey(address), numbers = queries!.get(key) ?? new Set<number>();
    numbers.add(Number(address.seat)); queries!.set(key, numbers);
  }
  const rowQueries = new Map(rows.map(row => [row.key, queries ? new Set(blockAliases.get(row.block)!.flatMap(alias => [...(queries.get(rowKey({ block: alias, row: row.row })) ?? [])])) : null]));
  for (const row of rows) {
    const requested = rowQueries.get(row.key);
    for (const seat of row.seats) {
      if (requested && !requested.has(Number(seat.address.seat))) continue;
      for (const alias of blockAliases.get(row.block)!) {
        const key = seatKey({ ...seat.address, block: alias });
        byLabel.set(key, [...(byLabel.get(key) ?? []), seat]);
      }
    }
  }
  return { id: `${layout.id}:${numbering.kind}:${numbering.start}:${numbering.direction}`, shapeId: layout.id, layout, numbering, seats, rows, byLabel };
}

export function generateSeatCandidates(layouts: ArenaLayout[]) {
  const candidates = layouts.flatMap(layout => numberingRules.map(rule => generateCandidateSeats(layout, rule)));
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error("Duplicate candidate ID");
  return candidates;
}
