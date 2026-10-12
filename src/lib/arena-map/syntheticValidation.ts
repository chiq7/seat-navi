import { type ArenaLayout, type Landmark, type LayoutBlock, type Point, type Shape } from "./layoutModel";
import { analyzeReports, compareLayouts, type TimedSeatEvidence } from "./reportEvidence";

export const validationEvent = "synthetic-ground-truth";
const cutoff = "2026-09-27T10:00:00Z";
export const truthCases = [
  { id: "circle-straight", label: "円形＋直線花道", center: "circle", runway: "straight" },
  { id: "square-straight", label: "四角＋直線花道", center: "square", runway: "straight" },
  { id: "circle-cross", label: "円形＋横花道", center: "circle", runway: "cross" },
] as const;
export type TruthCase = typeof truthCases[number]["id"];
export const sampleProfiles = [
  { id: "3", label: "3席", count: 3 }, { id: "30", label: "30席", count: 30 },
  { id: "100", label: "100席", count: 100 }, { id: "all", label: "全席", count: Infinity },
  { id: "biased", label: "前方のみ", count: 100 },
] as const;
export type SampleProfile = typeof sampleProfiles[number]["id"];
export type SyntheticSeat = { evidence: TimedSeatEvidence; actualPoint: Point };

// Independent oracle: analytic formulas, not containsPoint/resolveSeat/layoutSeats.
// Tests can therefore catch errors in the application's own seat/collision calculations.
export function createTruthSeats(caseId: TruthCase, renumber = false): SyntheticSeat[] {
  const truth = truthCases.find(c => c.id === caseId)!;
  const seats: SyntheticSeat[] = [];
  for (let br = 0; br < 2; br++) for (let bc = 0; bc < 2; bc++) for (let row = 1; row <= 14; row++) {
    let nextNumber = 1;
    for (let column = 1; column <= 20; column++) {
      const x = 90 + bc * 132 + (column - 1) * 6, y = 116 + br * 132 + (row - 1) * 8;
      const center = truth.center === "circle" ? (x - 216) ** 2 + (y - 242) ** 2 <= 48 ** 2
        : Math.abs(x - 216) <= 48 && Math.abs(y - 242) <= 48;
      const straight = x >= 210 && x <= 222 && y >= 85 && y <= 194;
      const horizontal = truth.runway === "cross" && x >= 100 && x <= 332 && y >= 236 && y <= 248;
      if (center || straight || horizontal) continue;
      const block = `${br ? "B" : "A"}${bc + 1}`, seat = String(renumber ? nextNumber++ : column);
      seats.push({ actualPoint: { x, y }, evidence: { id: `${block}:${row}:${seat}`, eventId: validationEvent, block, row: String(row), seat, precision: "exact", source: "fan-report", sourceRef: `synthetic:${block}:${row}:${seat}`, availableAt: "2026-09-27T09:00:00Z" } });
    }
  }
  return seats;
}

const rectangle = (x: number, y: number, w: number, h: number): Shape => ({ kind: "polygon", points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] });

/** Candidate mapping is the independently declared, regular numbering grid.
 * It does not receive the truth's missing seats, capacity, mask or coordinates.
 * Thus preserved numbering is an assumption; renumbering is intentionally tested too.
 */
export function createBlindCandidates(): ArenaLayout[] {
  const blocks: LayoutBlock[] = [];
  for (let br = 0; br < 2; br++) for (let bc = 0; bc < 2; bc++) blocks.push({
    id: `${br ? "B" : "A"}${bc + 1}`, origin: { x: 90 + bc * 132, y: 116 + br * 132 }, rotation: 0,
    labelAt: { x: 147 + bc * 132, y: 107 + br * 132 }, outline: [],
    rows: Array.from({ length: 14 }, (_, r) => ({ label: String(r + 1), segments: [{ first: 1, last: 20, origin: { x: 0, y: r * 8 }, step: { x: 6, y: 0 } }] })),
  });
  const centers: { id: string; label: string; shape?: Shape }[] = [
    { id: "circle", label: "円形", shape: { kind: "circle", center: { x: 216, y: 242 }, radius: 48 } },
    { id: "small", label: "小さい円", shape: { kind: "circle", center: { x: 216, y: 242 }, radius: 24 } },
    { id: "large", label: "大きい円", shape: { kind: "circle", center: { x: 216, y: 242 }, radius: 72 } },
    { id: "shifted", label: "右にずれた円", shape: { kind: "circle", center: { x: 264, y: 242 }, radius: 48 } },
    { id: "square", label: "四角", shape: rectangle(168, 194, 96, 96) },
    { id: "none", label: "センステなし" },
  ];
  const runways = ["straight", "wide", "cross", "none"] as const;
  return centers.flatMap(center => runways.map(runway => {
    const landmarks: Landmark[] = [{ id: "main", kind: "main", label: "メイン", shape: rectangle(64, 35, 304, 50), labelAt: { x: 216, y: 60 } }];
    if (center.shape) landmarks.push({ id: "center", kind: "center", label: "センステ", shape: center.shape, labelAt: center.id === "shifted" ? { x: 264, y: 242 } : { x: 216, y: 242 } });
    if (runway !== "none") landmarks.push({ id: "runway", kind: "runway", label: "花道", shape: rectangle(runway === "wide" ? 198 : 210, 85, runway === "wide" ? 36 : 12, 109), labelAt: { x: 216, y: 140 } });
    if (runway === "cross") landmarks.push({ id: "cross", kind: "runway", label: "横花道", shape: rectangle(100, 236, 232, 12), labelAt: { x: 308, y: 242 } });
    const runwayLabel = { straight: "直線", wide: "太い直線", cross: "横花道あり", none: "花道なし" }[runway];
    return { id: `${center.id}-${runway}`, version: "1", label: `${center.label}・${runwayLabel}`, eventIds: [validationEvent], status: "sample" as const, bounds: { x: 55, y: 20, width: 330, height: 360 }, blocks, landmarks };
  }));
}

function shuffled<T>(values: T[], seed: number): T[] {
  const result = [...values]; let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(state / 4294967296 * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function runSyntheticValidation(caseId: TruthCase, profile: SampleProfile, seed = 1, renumber = false) {
  const truthSeats = createTruthSeats(caseId, renumber);
  const source = profile === "biased" ? truthSeats.filter(s => s.evidence.block === "A1" && Number(s.evidence.row) <= 5) : truthSeats;
  const requested = sampleProfiles.find(p => p.id === profile)!.count;
  const samples = shuffled(source, seed).slice(0, requested);
  const candidates = createBlindCandidates();
  const comparison = compareLayouts(candidates, analyzeReports(samples.map(s => s.evidence), validationEvent, cutoff));
  const correct = comparison.candidates.find(c => c.id === caseId)!;
  return { caseId, profile, seed, renumber, truthSeats, samples, candidates, comparison,
    actualSeats: truthSeats.length, sampleCount: samples.length,
    correctRetained: comparison.compatibleIds.includes(caseId),
    exactIdentified: comparison.compatibleIds.length === 1 && comparison.compatibleIds[0] === caseId,
    correctConflictCount: correct.check?.mapped.filter(m => m.conflicts.length).length ?? 0,
  };
}

export function validationSummary(repeats = 20) {
  return truthCases.flatMap(truth => sampleProfiles.map(profile => {
    const results = Array.from({ length: repeats }, (_, i) => runSyntheticValidation(truth.id, profile.id, i + 1));
    const counts = results.map(r => r.comparison.compatibleIds.length);
    return { caseId: truth.id, caseLabel: truth.label, profile: profile.label, sampleCount: results[0].sampleCount,
      repeats, correctRetained: results.filter(r => r.correctRetained).length, exactIdentified: results.filter(r => r.exactIdentified).length,
      remainingMin: Math.min(...counts), remainingMax: Math.max(...counts) };
  }));
}
