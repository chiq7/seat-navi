import { type ArenaLayout, type Shape } from "./layoutModel";
import { generateSeatCandidates, type SeatCandidate } from "./candidateSeatModel";
import { rankSeatCandidates, type RankingOptions } from "./candidateRanking";
import { analyzeReports } from "./reportEvidence";
import { createBlindCandidates, createTruthSeats, runSyntheticValidation, validationEvent, type SyntheticSeat, type TruthCase } from "./syntheticValidation";

export const v2Profiles = [
  { id: "0", label: "0席", count: 0 }, { id: "3", label: "3席", count: 3 }, { id: "30", label: "30席", count: 30 },
  { id: "100", label: "100席", count: 100 }, { id: "all", label: "全席", count: Infinity }, { id: "biased", label: "前方のみ", count: 100 },
  { id: "one-sided", label: "片側のみ", count: 100 },
] as const;
export type V2Profile = typeof v2Profiles[number]["id"];
export const v2Cases = [
  { id: "circle-straight", label: "円形＋直線花道" }, { id: "square-straight", label: "四角＋直線花道" },
  { id: "circle-cross", label: "円形＋横花道" }, { id: "none-none", label: "センステ・花道なし" },
  { id: "circle-none", label: "円形・花道なし" }, { id: "none-straight", label: "センステなし・直線花道" },
  { id: "holdout-round", label: "未使用：ずれた小円" }, { id: "holdout-square", label: "未使用：ずれた四角" },
] as const;
export type V2Case = typeof v2Cases[number]["id"];
export const validationCutoff = "2026-09-27T10:00:00Z";
const originalCases = new Set<string>(["circle-straight", "square-straight", "circle-cross"]);

/** Oracle uses only analytic geometry, independently from candidate geometry/seat generation. */
export function createV2TruthSeats(caseId: V2Case, renumber: boolean): SyntheticSeat[] {
  if (originalCases.has(caseId)) return createTruthSeats(caseId as TruthCase, renumber);
  const seats: SyntheticSeat[] = [];
  for (let br = 0; br < 2; br++) for (let bc = 0; bc < 2; bc++) for (let row = 1; row <= 14; row++) {
    let next = 1;
    for (let column = 1; column <= 20; column++) {
      const x = 90 + bc * 132 + (column - 1) * 6, y = 116 + br * 132 + (row - 1) * 8;
      const center = caseId === "circle-none" ? (x - 216) ** 2 + (y - 242) ** 2 <= 48 ** 2
        : caseId === "holdout-round" ? (x - 204) ** 2 + (y - 258) ** 2 <= 37 ** 2
        : caseId === "holdout-square" ? Math.abs(x - 228) <= 39 && Math.abs(y - 250) <= 39 : false;
      const runway = caseId === "none-straight" ? x >= 210 && x <= 222 && y >= 85 && y <= 194
        : caseId === "holdout-round" ? x >= 195 && x <= 213 && y >= 85 && y <= 221
        : caseId === "holdout-square" ? x >= 216 && x <= 240 && y >= 85 && y <= 211 : false;
      if (center || runway) continue;
      const block = `${br ? "B" : "A"}${bc + 1}`, seat = String(renumber ? next++ : column);
      seats.push({ actualPoint: { x, y }, evidence: { id: `${block}:${row}:${seat}`, eventId: validationEvent, block, row: String(row), seat,
        precision: "exact", source: "fan-report", sourceRef: `synthetic:${block}:${row}:${seat}`, availableAt: "2026-09-27T09:00:00Z" } });
    }
  }
  return seats;
}

const rect = (x: number, y: number, w: number, h: number): Shape => ({ kind: "polygon", points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] });
/** Independently declared library extensions, never constructed from truth-seat coordinates. */
export function createV2Layouts(includeHeldout = false): ArenaLayout[] {
  const layouts = createBlindCandidates();
  if (!includeHeldout) return layouts;
  const base = layouts.find(c => c.id === "none-none")!;
  return [...layouts,
    { ...base, id: "holdout-round", label: "ずれた小円・直線", landmarks: [...base.landmarks,
      { id: "center", kind: "center", label: "センステ", shape: { kind: "circle", center: { x: 204, y: 258 }, radius: 37 }, labelAt: { x: 204, y: 258 } },
      { id: "runway", kind: "runway", label: "花道", shape: rect(195, 85, 18, 136), labelAt: { x: 204, y: 145 } }] },
    { ...base, id: "holdout-square", label: "ずれた四角・直線", landmarks: [...base.landmarks,
      { id: "center", kind: "center", label: "センステ", shape: rect(189, 211, 78, 78), labelAt: { x: 228, y: 250 } },
      { id: "runway", kind: "runway", label: "花道", shape: rect(216, 85, 24, 126), labelAt: { x: 228, y: 145 } }] },
  ];
}

// Reuse immutable generated hypotheses across benchmark trials; no observation is cached.
let regularCandidates: SeatCandidate[] | undefined, extendedCandidates: SeatCandidate[] | undefined;
export function v2Candidates(includeHeldout = false) {
  if (includeHeldout) return extendedCandidates ??= generateSeatCandidates(createV2Layouts(true));
  return regularCandidates ??= generateSeatCandidates(createV2Layouts());
}
export function sampleV2Seats(seats: SyntheticSeat[], profile: V2Profile, seed: number) {
  const source = seats.filter(s => profile === "biased" ? s.evidence.block === "A1" && Number(s.evidence.row) <= 5
    : profile === "one-sided" ? s.evidence.block.endsWith("1") : true);
  let state = seed >>> 0;
  for (let i = source.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(state / 4294967296 * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }
  return source.slice(0, v2Profiles.find(p => p.id === profile)!.count);
}
export function fullCensusScope(): NonNullable<RankingOptions["census"]> {
  return { eventId: validationEvent, sourceRef: "test:declared-complete-4-blocks", rows: ["A1", "A2", "B1", "B2"].flatMap(block => Array.from({ length: 14 }, (_, i) => ({ block, row: String(i + 1) }))) };
}
export function runV2Validation(caseId: V2Case, profile: V2Profile, seed = 1, renumber = false, census = false, includeHeldout = false) {
  const truthSeats = createV2TruthSeats(caseId, renumber), samples = sampleV2Seats(truthSeats, profile, seed);
  const analysis = analyzeReports(samples.map(s => s.evidence), validationEvent, validationCutoff);
  const candidates = v2Candidates(includeHeldout);
  const comparison = rankSeatCandidates(candidates, analysis, census ? { census: fullCensusScope() } : {});
  // Answer checking only after inference. These values never enter rankSeatCandidates.
  const correct = comparison.evaluated.find(e => e.candidate.shapeId === caseId && e.candidate.numbering.kind === (renumber ? "row-reset" : "preserved"));
  const coordinateErrors = correct ? samples.filter(s => {
    const matches = correct.candidate.byLabel.get(JSON.stringify([s.evidence.block, s.evidence.row, s.evidence.seat]));
    return matches?.length !== 1 || Math.hypot(matches[0].point.x - s.actualPoint.x, matches[0].point.y - s.actualPoint.y) > 1e-6;
  }).length : null;
  return { caseId, profile, seed, renumber, census, truthSeats, samples, candidates, comparison,
    correctRetained: correct?.compatible ?? false, correctHypothesisTop: correct?.top ?? false,
    correctShapeTop: comparison.topShapeIds.includes(caseId), coordinateErrors, correctInLibrary: !!correct,
    uniqueShapeCorrect: comparison.topShapeIds.length === 1 && comparison.topShapeIds[0] === caseId,
    uniqueShapeWrong: comparison.topShapeIds.length === 1 && comparison.topShapeIds[0] !== caseId,
  };
}

export function baselineFor(caseId: V2Case, profile: V2Profile, seed: number, renumber: boolean) {
  if (!originalCases.has(caseId) || profile === "0" || profile === "one-sided") return null;
  return runSyntheticValidation(caseId as TruthCase, profile, seed, renumber);
}
