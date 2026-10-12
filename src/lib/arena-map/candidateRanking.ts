import { containsPoint, normalizeLabel, type Point, type SeatAddress, type Shape } from "./layoutModel";
import { rowKey, seatKey, type CandidateRow, type SeatCandidate } from "./candidateSeatModel";
import { type EvidenceAnalysis, type TimedSeatEvidence } from "./reportEvidence";

export const rankingConfig = Object.freeze({ minimumReportsPerRow: 4, minimumObservedSpan: 8, adjacentDistanceFactor: 1.6, tieLogMargin: 2 });
type EvidenceSource = { eventId: string; sourceRef: string };
export type AdditionalEvidence = EvidenceSource & (
  | { kind: "position"; address: SeatAddress; point: Point; tolerance: number }
  | { kind: "row-end"; address: SeatAddress; side: "minimum" | "maximum" }
  | { kind: "no-seats"; region: Shape }
);
export type CensusScope = EvidenceSource & { rows: { block: string; row: string }[] };
export type RankingOptions = { census?: CensusScope; additional?: AdditionalEvidence[] };
export type Conflict = { kind: "wrong-event" | "absent-label" | "ambiguous-label" | "position" | "stage-overlap" | "row-end" | "no-seats" | "census-extra" | "census-missing" | "census-unknown-row"; reference: string };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function adjacentRows(rows: CandidateRow[], row: CandidateRow) {
  // Same authored block, parallel rows; neighbors are physical, not lexical labels.
  const parallel = rows.filter(r => r.key !== row.key && r.block === row.block
    && Math.abs(r.direction.x * row.direction.x + r.direction.y * row.direction.y) > .99
    && Math.abs((r.center.x - row.center.x) * row.direction.x + (r.center.y - row.center.y) * row.direction.y) < 1e-5);
  const nearest = Math.min(...parallel.map(r => distance(r.center, row.center)).filter(d => d > 1e-5));
  return parallel.filter(r => distance(r.center, row.center) > 1e-5 && distance(r.center, row.center) <= nearest * rankingConfig.adjacentDistanceFactor);
}
export function logChoose(total: number, count: number) {
  if (total < count) return Infinity;
  let result = 0;
  for (let i = 1; i <= Math.min(count, total - count); i++) result += Math.log(total - i + 1) - Math.log(i);
  return result;
}
function scopeKey(candidate: SeatCandidate, address: { block: string; row: string }) {
  const blocks = candidate.layout.blocks.filter(b => [b.id, ...(b.aliases ?? [])].some(a => normalizeLabel(a) === normalizeLabel(address.block)));
  return blocks.length === 1 ? rowKey({ ...address, block: blocks[0].id }) : rowKey(address);
}

/** Only observables enter this function. Oracle coordinates/shape/sample rate are never inputs. */
export function validateRankingOptions(analysis: EvidenceAnalysis, options: RankingOptions) {
  const sources = [...(options.additional ?? []), ...(options.census ? [options.census] : [])];
  if (sources.some(s => s.eventId !== analysis.eventId || !s.sourceRef.trim())) throw new Error("Additional evidence requires matching event and provenance");
  if (options.census && !options.census.rows.length) throw new Error("Census requires an explicit nonempty scope");
  if (options.additional?.some(e => e.kind === "position" && (![e.point.x, e.point.y, e.tolerance].every(Number.isFinite) || e.tolerance < 0))) throw new Error("Invalid confirmed position");
}

/** Shared observable windows ensure the search and fixed library use exactly the same score. */
export function scoringWindows(reference: SeatCandidate, analysis: EvidenceAnalysis, options: RankingOptions = {}) {
  const observed = new Map<string, Set<number>>();
  for (const e of analysis.accepted) {
    const key = scopeKey(reference, e), values = observed.get(key) ?? new Set<number>();
    values.add(Number(e.seat)); observed.set(key, values);
  }
  const censusRows = new Set(options.census?.rows.map(r => scopeKey(reference, r)) ?? []);
  const qualified = (key: string) => {
    const numbers = [...(observed.get(key) ?? [])];
    return numbers.length >= rankingConfig.minimumReportsPerRow && Math.max(...numbers) - Math.min(...numbers) + 1 >= rankingConfig.minimumObservedSpan;
  };
  return reference.rows.flatMap(row => {
    if (!qualified(row.key) || censusRows.has(row.key)) return [];
    const neighbors = adjacentRows(reference.rows, row).filter(r => qualified(r.key) && !censusRows.has(r.key));
    if (!neighbors.length) return [];
    const numbers = [row, ...neighbors].flatMap(r => [...observed.get(r.key)!]);
    return [{ key: row.key, min: Math.min(...numbers), max: Math.max(...numbers), count: observed.get(row.key)!.size }];
  });
}

export function rankSeatCandidates(candidates: SeatCandidate[], analysis: EvidenceAnalysis, options: RankingOptions = {}, validationOnly = false) {
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error("Duplicate candidate ID");
  validateRankingOptions(analysis, options);
  // Stable reference, and soft scoring only for a shared known grid. Different grids remain unranked.
  const reference = [...candidates].sort((a, b) => a.id.localeCompare(b.id, "en"))[0];
  const gridSignature = (c: SeatCandidate) => JSON.stringify(c.rows.map(r => [r.key, r.center, r.direction, r.potentialNumbers]).sort((a, b) => String(a[0]).localeCompare(String(b[0]), "en")));
  const sharedGrid = !validationOnly && reference ? candidates.every(c => gridSignature(c) === gridSignature(reference)) : false;
  const windows = sharedGrid ? scoringWindows(reference, analysis, options) : [];
  const evaluated = candidates.map(candidate => {
    const conflicts: Conflict[] = [], mapped: { observation: TimedSeatEvidence; point: Point; positionStatus: "hypothesis" }[] = [];
    if (!candidate.layout.eventIds.includes(analysis.eventId)) conflicts.push({ kind: "wrong-event", reference: analysis.eventId });
    for (const e of analysis.accepted) {
      const matches = candidate.byLabel.get(seatKey(e)) ?? [];
      if (matches.length !== 1) {
        conflicts.push({ kind: matches.length ? "ambiguous-label" : "absent-label", reference: e.sourceRef });
        continue;
      }
      mapped.push({ observation: e, point: matches[0].point, positionStatus: "hypothesis" });
    }
    for (const e of options.additional ?? []) {
      if (e.kind === "no-seats") {
        if (candidate.seats.some(s => containsPoint(e.region, s.point))) conflicts.push({ kind: "no-seats", reference: e.sourceRef });
        continue;
      }
      // A confirmed physical seat vetoes overlap even if its label is absent in this hypothesis.
      if (e.kind === "position" && candidate.layout.landmarks.some(l => containsPoint(l.shape, e.point))) conflicts.push({ kind: "stage-overlap", reference: e.sourceRef });
      const matches = candidate.byLabel.get(seatKey(e.address)) ?? [];
      if (matches.length !== 1) { conflicts.push({ kind: matches.length ? "ambiguous-label" : "absent-label", reference: e.sourceRef }); continue; }
      if (e.kind === "position") {
        if (distance(matches[0].point, e.point) > e.tolerance) conflicts.push({ kind: "position", reference: e.sourceRef });
      } else {
        const row = candidate.rows.find(r => r.key === scopeKey(candidate, e.address));
        const numbers = row?.seats.map(s => Number(s.address.seat)) ?? [];
        const end = e.side === "minimum" ? Math.min(...numbers) : Math.max(...numbers);
        if (end !== Number(e.address.seat)) conflicts.push({ kind: "row-end", reference: e.sourceRef });
      }
    }
    if (options.census) {
      const scope = new Set(options.census.rows.map(r => scopeKey(candidate, r)));
      for (const key of scope) if (!candidate.rows.some(r => r.key === key)) conflicts.push({ kind: "census-unknown-row", reference: key });
      const expected = new Set(candidate.seats.filter(s => scope.has(rowKey(s.address))).map(s => seatKey(s.address)));
      const actual = new Set(analysis.accepted.filter(e => scope.has(scopeKey(candidate, e))).map(e => {
        const match = candidate.byLabel.get(seatKey(e));
        return match?.length === 1 ? seatKey(match[0].address) : seatKey(e);
      }));
      for (const key of expected) if (!actual.has(key)) conflicts.push({ kind: "census-extra", reference: key });
      for (const key of actual) if (!expected.has(key)) conflicts.push({ kind: "census-missing", reference: key });
    }
    let score = 0;
    for (const window of windows) {
      const row = candidate.rows.find(r => r.key === window.key);
      const numbers = new Set(row?.seats.map(s => Number(s.address.seat)).filter(n => n >= window.min && n <= window.max));
      score += logChoose(numbers.size, window.count);
    }
    return { candidate, conflicts, mapped, score, compatible: conflicts.length === 0, top: false };
  });
  const feasible = evaluated.filter(e => e.compatible), best = Math.min(...feasible.map(e => e.score));
  for (const e of feasible) e.top = e.score <= best + rankingConfig.tieLogMargin;
  evaluated.sort((a, b) => Number(b.compatible) - Number(a.compatible) || (a.compatible && b.compatible ? a.score - b.score : 0) || a.candidate.id.localeCompare(b.candidate.id, "en"));
  const top = feasible.filter(e => e.top);
  const hasEvidence = analysis.accepted.length > 0 || !!options.census || !!options.additional?.length;
  const state = !hasEvidence ? "no-evidence" : !feasible.length ? "needs-review" : analysis.held.length ? "held-input" : top.length > 1 ? "tied" : "leading-unverified";
  return { evaluated, topIds: top.map(e => e.candidate.id).sort(), topShapeIds: [...new Set(top.map(e => e.candidate.shapeId))].sort(),
    compatibleCount: feasible.length, state, abstained: state !== "leading-unverified", scoredRows: windows.length, sharedGrid, held: analysis.held };
}
