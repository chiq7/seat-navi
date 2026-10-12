import { containsPoint, normalizeLabel, type ArenaLayout, type Point, type SeatAddress } from "./layoutModel";
import { generateCandidateSeats, rowKey, seatKey, type NumberingRule, type SeatCandidate } from "./candidateSeatModel";
import { logChoose, rankSeatCandidates, type RankingOptions } from "./candidateRanking";
import { type EvidenceAnalysis } from "./reportEvidence";
import { layoutPatterns, patternLayout, patternVariants, type PatternFamily, type PatternVariant } from "./historicalLayoutPatterns";
import type { EventLayoutDefinition } from "./eventPredictionLayout";

export type HistoricalSupport = { sourceRef: string; originGroup: string; availableAt: string | null; family: PatternFamily; artist?: string; tour?: string; venue?: string; status: "prediction" | "confirmed" };
export type PredictionContext = { artist?: string; tour?: string; venue?: string; history?: HistoricalSupport[]; layoutDefinition?: EventLayoutDefinition };
export type PatternProposal = {
  id: string; family: PatternFamily; variant: PatternVariant; numbering: NumberingRule;
  cost: number; historyCost: number; evidenceCost: number; regularization: number;
  conflicts: number; mapped: number; scoredRows: number; top: boolean;
  layoutDefinition?: EventLayoutDefinition;
};
export type PatternPrediction = {
  state: "no-evidence" | "needs-review" | "held-input" | "tied" | "proposal";
  basis: "reports" | "history" | "template"; evaluated: PatternProposal[]; top: PatternProposal[];
  reportCount: number; heldCount: number; milliseconds: number; budgetLimited: boolean;
};
export const patternInferenceConfig = Object.freeze({ minimumRowReports: 4, extentWeight: .18, rowBalanceWeight: .35, variationWeight: .12, tieMargin: .06, maxCandidates: 640 });
export const expandedNumberingRules: readonly NumberingRule[] = (["preserved", "row-reset", "block-continuous"] as const).flatMap(kind => ([1, -1] as const).map(direction => ({ kind, start: 1, direction })));

function historyCost(family: PatternFamily, analysis: EvidenceAnalysis, context: PredictionContext) {
  const groups = new Map<string, number>();
  for (const h of context.history ?? []) {
    const time = h.availableAt && /(?:Z|[+-]\d\d:\d\d)$/.test(h.availableAt) ? Date.parse(h.availableAt) : NaN;
    if (!h.sourceRef.trim() || !h.originGroup.trim() || !Number.isFinite(time) || time > Date.parse(analysis.cutoff) || h.family !== family) continue;
    const same = (a?: string, b?: string) => !!a && !!b && normalizeLabel(a) === normalizeLabel(b);
    const match = same(context.tour, h.tour) && same(context.artist, h.artist) ? 1 : same(context.artist, h.artist) ? .55 : same(context.venue, h.venue) ? .2 : 0;
    const quality = h.status === "confirmed" ? 1 : .4;
    groups.set(h.originGroup, Math.max(groups.get(h.originGroup) ?? 0, match * quality));
  }
  // Best relevant source, not a vote count: copies and repeated revisions cannot amplify a prior.
  return 1 - Math.max(0, ...groups.values());
}

export function scorePatternReports(candidate: SeatCandidate, analysis: EvidenceAnalysis) {
  const reports = new Map<string, Set<number>>();
  for (const e of analysis.accepted) {
    const matches = candidate.byLabel.get(seatKey(e)); if (matches?.length !== 1) continue;
    const key = rowKey(matches[0].address), set = reports.get(key) ?? new Set<number>();
    set.add(Number(matches[0].address.seat)); reports.set(key, set);
  }
  const eligible = candidate.rows.filter(r => (reports.get(r.key)?.size ?? 0) >= patternInferenceConfig.minimumRowReports);
  const qualified = eligible.filter(r => eligible.some(other => other.block === r.block && other.key !== r.key
    && Math.abs(other.direction.x * r.direction.x + other.direction.y * r.direction.y) > .99
    && Math.hypot(other.center.x - r.center.x, other.center.y - r.center.y) < 30));
  let extent = 0, balance = 0;
  const blocks = new Map<string, typeof qualified>();
  for (const r of qualified) {
    const observed = [...reports.get(r.key)!].sort((a, b) => a - b), k = observed.length;
    const expected = r.seats.map(s => Number(s.address.seat)).sort((a, b) => a - b);
    const lo = expected.indexOf(observed[0]), hi = expected.indexOf(observed.at(-1)!);
    const span = hi - lo + 1;
    // Probability of the observed extrema conditional on k samples, NOT a confidence score.
    extent += Math.max(0, logChoose(expected.length, k) - logChoose(span - 2, k - 2)) / k;
    const rows = blocks.get(r.block) ?? []; rows.push(r); blocks.set(r.block, rows);
  }
  for (const rows of blocks.values()) {
    const count = rows.reduce((s, r) => s + reports.get(r.key)!.size, 0);
    const capacity = rows.reduce((s, r) => s + r.seats.length, 0);
    for (const r of rows) {
      const actual = reports.get(r.key)!.size / count, expected = r.seats.length / capacity;
      balance += actual * Math.log(actual / expected);
    }
  }
  return { cost: patternInferenceConfig.extentWeight * extent / Math.max(1, qualified.length) + patternInferenceConfig.rowBalanceWeight * balance / Math.max(1, blocks.size), scoredRows: qualified.length };
}

function fitsLabels(layout: ArenaLayout, analysis: EvidenceAnalysis) {
  // Cheap structural pruning, with no inference from unreported labels.
  return analysis.rows.every(row => layout.blocks.some(b => [b.id, ...(b.aliases ?? [])].some(a => normalizeLabel(a) === row.block) && b.rows.some(r => normalizeLabel(r.label) === row.row)));
}

/** The oracle, event-specific truth IDs, true coordinates and sampling rate are not accepted. */
export function inferPatternLayouts(analysis: EvidenceAnalysis, context: PredictionContext = {}, options: RankingOptions = {}, settings: { families?: readonly PatternFamily[]; refinements?: boolean; baseline?: boolean } = {}): PatternPrediction {
  const start = performance.now(), evaluated: PatternProposal[] = [];
  // Presence is checked once per address. The original analysis still retains every source.
  const uniqueReports = [...new Map(analysis.accepted.map(e => [seatKey(e), e])).values()];
  const checks = { ...analysis, accepted: uniqueReports };
  let budgetLimited = false;
  const families = settings.families ?? layoutPatterns.map(p => p.family);
  const unique = new Set<string>();
  function evaluate(family: PatternFamily, variant: PatternVariant) {
    const layout = patternLayout(family, analysis.eventId, variant);
    if (!fitsLabels(layout, analysis)) return;
    for (const numbering of expandedNumberingRules) {
      const id = `${layout.id}:${numbering.kind}:${numbering.direction}`;
      if (unique.has(id)) continue;
      if (evaluated.length >= patternInferenceConfig.maxCandidates) { budgetLimited = true; return; }
      unique.add(id);
      const indexedAddresses = [...analysis.accepted, ...(options.additional ?? []).flatMap(e => e.kind === "no-seats" ? [] : [e.address])];
      const candidate = generateCandidateSeats(layout, numbering, indexedAddresses);
      const checked = rankSeatCandidates([candidate], checks, options, true).evaluated[0];
      const evidence = checked.compatible ? scorePatternReports(candidate, analysis) : { cost: 0, scoredRows: 0 };
      const prior = historyCost(family, analysis, context);
      const regularization = patternInferenceConfig.variationWeight * (Math.abs(variant.offset) / 12 + Math.abs(variant.width - 1) / .15 + Math.abs(variant.grid - 1) / .03) + (variant.mainOnly ? .08 : 0);
      evaluated.push({ id, family, variant, numbering, cost: settings.baseline ? 0 : prior + evidence.cost + regularization,
        historyCost: prior, evidenceCost: evidence.cost, regularization, conflicts: checked.conflicts.length,
        mapped: new Set(checked.mapped.map(m => seatKey(candidate.byLabel.get(seatKey(m.observation))![0].address))).size, scoredRows: evidence.scoredRows, top: false });
    }
  }
  for (const family of new Set(families)) for (const variant of patternVariants) evaluate(family, variant);
  if (settings.refinements !== false && !settings.baseline && analysis.accepted.length) {
    // Retain seeds from different structures, instead of committing to one early winner.
    const seeds = [...evaluated].filter(p => !p.conflicts && !p.variant.mainOnly).sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
    const chosen = new Map<PatternFamily, PatternProposal>();
    for (const p of seeds) if (!chosen.has(p.family) && chosen.size < 3) chosen.set(p.family, p);
    for (const p of chosen.values()) for (const offset of [-4, 4]) for (const width of [-.05, .05]) {
      evaluate(p.family, { ...p.variant, offset: p.variant.offset + offset, width: Number((p.variant.width + width).toFixed(2)) });
    }
  }
  evaluated.sort((a, b) => a.conflicts - b.conflicts || a.cost - b.cost || a.id.localeCompare(b.id));
  const compatible = evaluated.filter(p => !p.conflicts), best = compatible[0]?.cost ?? Infinity;
  for (const p of compatible) p.top = p.cost <= best + patternInferenceConfig.tieMargin;
  const top = compatible.filter(p => p.top);
  const nonempty = analysis.accepted.length > 0 || !!options.additional?.length || !!options.census;
  const historyDifferentiates = new Set(compatible.map(p => p.historyCost)).size > 1;
  return { state: !nonempty ? "no-evidence" : !compatible.length ? "needs-review" : analysis.held.length ? "held-input" : top.length > 1 ? "tied" : "proposal",
    basis: top.some(p => p.scoredRows) ? "reports" : historyDifferentiates ? "history" : "template", evaluated, top,
    reportCount: analysis.accepted.length - analysis.repeatedPositions, heldCount: analysis.held.length, milliseconds: performance.now() - start, budgetLimited };
}

export function proposalCandidate(proposal: PatternProposal, eventId: string) {
  return generateCandidateSeats(patternLayout(proposal.family, eventId, proposal.variant), proposal.numbering);
}

export type RelativeSeatPosition = { mapped: boolean; point?: Point; main: "メイン寄り" | "センステ寄り" | "後方寄り"; center: "前側" | "横側" | "後ろ側" | "なし"; runway: "花道の横" | "離れている" | "なし"; centerId?: string };
export function relationAtPoint(layout: ArenaLayout, point: Point): Omit<RelativeSeatPosition, "mapped" | "point"> {
  const main = layout.landmarks.find(l => l.kind === "main")!.labelAt;
  const centers = layout.landmarks.filter(l => l.kind === "center");
  const center = [...centers].sort((a, b) => Math.hypot(point.x - a.labelAt.x, point.y - a.labelAt.y) - Math.hypot(point.x - b.labelAt.x, point.y - b.labelAt.y))[0];
  const axis = center ? { x: center.labelAt.x - main.x, y: center.labelAt.y - main.y } : { x: layout.bounds.x + layout.bounds.width / 2 - main.x, y: layout.bounds.y + layout.bounds.height / 2 - main.y };
  const length = Math.hypot(axis.x, axis.y) || 1, ux = axis.x / length, uy = axis.y / length;
  const relative = center ? { x: point.x - center.labelAt.x, y: point.y - center.labelAt.y } : { x: point.x - main.x, y: point.y - main.y };
  const forward = relative.x * ux + relative.y * uy, lateral = relative.x * uy - relative.y * ux;
  const centerSide = !center ? "なし" : Math.abs(lateral) > Math.abs(forward) ? "横側" : forward < 0 ? "前側" : "後ろ側";
  const paths = layout.landmarks.filter(l => l.kind === "runway");
  const close = paths.some(l => {
    if (containsPoint(l.shape, point)) return true;
    if (l.shape.kind === "circle") return Math.abs(Math.hypot(point.x - l.shape.center.x, point.y - l.shape.center.y) - l.shape.radius) <= 12;
    return l.shape.points.some((b, i) => {
      const a = l.shape.kind === "polygon" ? l.shape.points[(i + l.shape.points.length - 1) % l.shape.points.length] : b;
      const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy) <= 12;
    });
  });
  const mainDistance = Math.hypot(point.x - main.x, point.y - main.y);
  const centerDistance = center ? Math.hypot(relative.x, relative.y) : Infinity;
  const floorDepth = Math.max(...[layout.bounds.x, layout.bounds.x + layout.bounds.width].flatMap(x => [layout.bounds.y, layout.bounds.y + layout.bounds.height].map(y => (x - main.x) * ux + (y - main.y) * uy)));
  return { main: center ? mainDistance < centerDistance ? "メイン寄り" : "センステ寄り" : (point.x - main.x) * ux + (point.y - main.y) * uy < floorDepth * .45 ? "メイン寄り" : "後方寄り",
    center: centerSide, runway: !paths.length ? "なし" : close ? "花道の横" : "離れている", centerId: center?.id };
}

export function proposalSeatRelation(candidate: SeatCandidate, address: SeatAddress): RelativeSeatPosition {
  const seats = candidate.byLabel.get(seatKey(address));
  if (seats?.length !== 1) return { mapped: false, main: "後方寄り", center: "なし", runway: "なし" };
  const point = seats[0].point;
  return { mapped: true, point, ...relationAtPoint(candidate.layout, point) };
}
