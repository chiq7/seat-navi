import { containsPoint, normalizeLabel, type ArenaLayout, type Point, type Shape, type SeatAddress } from "./layoutModel";
import { generateCandidateSeats, seatKey, rowKey, type SeatCandidate, type CandidateRow, type NumberingRule } from "./candidateSeatModel";
import { recoverJointGeometry } from "./jointGeometrySearch";
import { logChoose, rankSeatCandidates, validateRankingOptions, type RankingOptions } from "./candidateRanking";
import { layoutPatterns, patternVariants, type PatternFamily, type PatternVariant } from "./historicalLayoutPatterns";
import { expandedNumberingRules, inferPatternLayouts, scorePatternReports as legacyScore, type PatternPrediction, type PatternProposal, type PredictionContext, type RelativeSeatPosition } from "./patternInference";
import type { EvidenceAnalysis } from "./reportEvidence";
import { eventPatternLayout, proposalLayout } from "./eventPredictionLayout";
import { distinctProposals } from "./proposalSelection";

export const inferenceV5Config = Object.freeze({ maxCandidates: 6000, seedsPerRule: 2, tieMargin: .006, historyWeight: .015, variationWeight: .006,
  rounds: [{ offset: 6, width: .075, grid: .015 }, { offset: 3, width: .0375, grid: .0075 }, { offset: 1.5, width: .01875, grid: .00375 }],
  recovery: { offsets: [-24,-12,0,12,24], widths: [.75,.9,1.05,1.2], grids: [.94,.96,.98,1,1.02,1.04,1.06] },
  ranges: { offset: [-30, 30], width: [.7, 1.3], grid: [.94, 1.06] } });
export type InferenceV5Settings = { families?: readonly PatternFamily[]; search?: "v3" | "v5"; ranking?: "v3" | "v5"; refinements?: boolean; independentGeometry?: boolean; jointRecovery?: boolean; canonicalOrientation?: boolean; maxCandidates?: number; historyWeight?: number;
  // Explicit finite domains support reproducible exhaustive checks, not oracle-directed parameters.
  domain?: readonly PatternVariant[]; numbering?: readonly NumberingRule[] };
export type PredictionV5 = PatternPrediction & { version: "v5"; failure: "none" | "unknown-labels" | "budget" | "no-compatible-sampled";
  diagnostics: { scoredRows: number; distinctPositions: number; families: number; rounds: number; search: "v3" | "v5"; ranking: "v3" | "v5" } };

/** Same observed row windows for every grid. No inference from missing rows or ticket tiers. */
export function scoreReportsV5(candidate: SeatCandidate, analysis: EvidenceAnalysis) {
  const costs: number[] = [];
  for (const observed of analysis.rows) {
    if (observed.uniquePositions < 2) continue;
    const first = candidate.byLabel.get(seatKey({ ...observed, seat: String(observed.observedMin) }));
    const row = first?.length === 1 ? candidate.rows.find(r => r.block === first[0].address.block && r.row === first[0].address.row) : undefined;
    if (!row) { costs.push(0); continue; } // Hard label checking vetoes this candidate separately.
    const expected = row.seats.map(s => Number(s.address.seat)).sort((a, b) => a - b);
    const lo = expected.indexOf(observed.observedMin), hi = expected.indexOf(observed.observedMax);
    const k = observed.uniquePositions;
    // Dense adjacent groups are one local existence signal, not k independent uniform draws.
    const runFraction = Math.max(...observed.observedRuns.map(r => r.last - r.first + 1)) / k;
    const effective = Math.min(k, 4), span = hi - lo + 1;
    const cost = Math.max(0, logChoose(expected.length, effective) - logChoose(Math.max(0, span - 2), effective - 2)) / effective;
    costs.push(Math.min(2, cost) * (runFraction > .8 ? .1 : 1));
  }
  return { cost: costs.length ? costs.reduce((s, v) => s + v, 0) / costs.length * .1 : 0, scoredRows: costs.length };
}

function priorCost(family: PatternFamily, analysis: EvidenceAnalysis, context: PredictionContext) {
  let support = 0;
  for (const h of context.history ?? []) {
    if (!h.sourceRef.trim() || !h.originGroup.trim() || h.family !== family || !h.availableAt || !/(Z|[+-]\d\d:\d\d)$/.test(h.availableAt)) continue;
    const t = Date.parse(h.availableAt); if (!Number.isFinite(t) || t > Date.parse(analysis.cutoff)) continue;
    const same = (a?: string, b?: string) => !!a && !!b && normalizeLabel(a) === normalizeLabel(b);
    const related = same(context.artist, h.artist) && same(context.tour, h.tour) ? 1 : same(context.artist, h.artist) ? .55 : same(context.venue, h.venue) ? .2 : 0;
    support = Math.max(support, related * (h.status === "confirmed" ? 1 : .4));
  }
  return 1 - support;
}
const rounded = (v: number) => Number(v.toFixed(6));
const variation = (v: PatternVariant) => Math.abs(v.offset) / 30 + Math.abs(v.width - 1) + Math.abs(v.grid - 1)
  + Math.abs((v.runwayWidth ?? v.width) - v.width) + Math.abs(v.shiftX ?? 0) / 30 + Math.abs(v.rearOffset ?? 0) / 30;
const fitsLabels = (layout: ArenaLayout, analysis: EvidenceAnalysis) => analysis.rows.every(r => layout.blocks.some(b => [b.id, ...(b.aliases ?? [])].some(a => normalizeLabel(a) === r.block) && b.rows.some(row => normalizeLabel(row.label) === r.row)));
const compare = (a: PatternProposal, b: PatternProposal) => a.conflicts - b.conflicts || a.cost - b.cost || a.id.localeCompare(b.id, "en");

export function inferPatternLayoutsV5(analysis: EvidenceAnalysis, context: PredictionContext = {}, options: RankingOptions = {}, settings: InferenceV5Settings = {}): PredictionV5 {
  const started = performance.now(), search = settings.search ?? "v5", ranking = settings.ranking ?? "v5";
  const historyWeight = settings.historyWeight ?? inferenceV5Config.historyWeight;
  if (!Number.isFinite(historyWeight) || historyWeight < 0) throw new Error("historyWeight must be finite and nonnegative");
  validateRankingOptions(analysis, options);
  if (context.layoutDefinition && settings.search === "v3") throw new Error("Fixed v3 comparison does not accept an event model");
  // Fixed v3 output is retained for ranking-only comparisons with exactly the old candidates.
  const old = search === "v3" ? inferPatternLayouts(analysis, context, options, { families: settings.families, refinements: settings.refinements }) : null;
  const checks = { ...analysis, accepted: [...new Map(analysis.accepted.map(e => [seatKey(e), e])).values()] };
  const indexed = [...checks.accepted, ...(options.additional ?? []).flatMap(e => e.kind === "no-seats" ? [] : [e.address])];
  const families = [...new Set(settings.families ?? layoutPatterns.map(p => p.family))].sort();
  const evaluated: PatternProposal[] = [], seen = new Set<string>(), searchPoints = new Map<string, PatternProposal & { gap: number }>();
  const budget = settings.maxCandidates ?? inferenceV5Config.maxCandidates;
  let budgetLimited = false, rounds = 0, labelFamilies = 0;
  const rules = settings.numbering ?? expandedNumberingRules;
  function evaluate(family: PatternFamily, variant: PatternVariant, rule: NumberingRule) {
    const layout = eventPatternLayout(family, analysis.eventId, variant, context.layoutDefinition), id = `${layout.id}:${rule.kind}:${rule.start}:${rule.direction}`;
    if (seen.has(id)) return searchPoints.get(id);
    if (!fitsLabels(layout, analysis)) return;
    if (evaluated.length >= budget) { budgetLimited = true; return; }
    seen.add(id);
    const candidate = generateCandidateSeats(layout, rule, indexed, !options.census && !options.additional?.length && indexed.length > 0);
    const checked = rankSeatCandidates([candidate], checks, options, true).evaluated[0];
    const score = scoreReportsV5(candidate, analysis), prior = priorCost(family, analysis, context);
    // Component removal is a change to the reference topology, like width/position edits.
    // Equipment-only and truly main-only families are not penalised for lacking a centre stage.
    const topologyEdits = variant.mainOnly ? eventPatternLayout(family, analysis.eventId, { ...variant, mainOnly: false }, context.layoutDefinition).landmarks.length - layout.landmarks.length : 0;
    const regularization = inferenceV5Config.variationWeight * (variation(variant) + topologyEdits * 2);
    evaluated.push({ id, family, variant, numbering: rule, conflicts: checked.conflicts.length, mapped: checked.mapped.length,
      evidenceCost: score.cost, scoredRows: score.scoredRows, historyCost: prior, regularization,
      cost: score.cost + historyWeight * prior + regularization, top: false,
      ...(context.layoutDefinition ? { layoutDefinition: context.layoutDefinition } : {}) });
    if (ranking === "v3") {
      const p = evaluated.at(-1)!, legacy = legacyScore(candidate, analysis);
      p.evidenceCost = legacy.cost; p.scoredRows = legacy.scoredRows;
      p.regularization = .12 * (Math.abs(p.variant.offset) / 12 + Math.abs(p.variant.width - 1) / .15 + Math.abs(p.variant.grid - 1) / .03) + (p.variant.mainOnly ? .08 : 0);
      p.cost = p.historyCost + p.evidenceCost + p.regularization;
    }
    const aliases = new Map(candidate.layout.blocks.map(b => [b.id, [...(b.aliases ?? []), b.id]]));
    const rows: Map<string, CandidateRow> = checked.conflicts.length ? new Map(candidate.rows.flatMap(r => aliases.get(r.block)!.map(alias => [rowKey({ ...r, block: alias }), r] as const))) : new Map();
    let gap = 0;
    for (const observed of checks.accepted) {
      if (candidate.byLabel.has(seatKey(observed))) continue;
      const row = rows.get(rowKey(observed)), number = Number(observed.seat);
      const distance = row?.seats.length ? rule.kind === "preserved" ? Math.min(...row.seats.map(s => Math.abs(Number(s.address.seat) - number)))
        : Math.max(0, Math.min(Number(row.seats[0].address.seat), Number(row.seats.at(-1)!.address.seat)) - number, number - Math.max(Number(row.seats[0].address.seat), Number(row.seats.at(-1)!.address.seat))) : 100;
      gap += distance;
    }
    const point = { ...evaluated.at(-1)!, gap };
    searchPoints.set(id, point); return point;
  }
  for (const family of families) if (fitsLabels(eventPatternLayout(family, analysis.eventId, patternVariants[0], context.layoutDefinition), analysis)) labelFamilies++;
  if (old) for (const p of old.evaluated) evaluate(p.family, p.variant, p.numbering);
  else {
    // Round-robin initial seeds keep the budget independent of supplied family order.
    for (const variant of settings.domain ?? patternVariants) for (const family of families) for (const rule of rules) evaluate(family, variant, rule);
    if (!settings.domain && settings.refinements !== false && indexed.length) {
      for (const step of inferenceV5Config.rounds) {
        rounds++;
        const buckets = new Map<string, PatternProposal[]>();
        for (const p of [...evaluated].sort(compare)) {
          if (p.variant.mainOnly) continue;
          const key = `${p.family}:${p.numbering.kind}:${p.numbering.direction}`;
          const group = buckets.get(key) ?? [];
          if (group.length < inferenceV5Config.seedsPerRule) group.push(p);
          buckets.set(key, group);
        }
        // Each bucket keeps even conflicting seeds: nearby valid cut-outs must remain reachable.
        for (let seed = 0; seed < inferenceV5Config.seedsPerRule; seed++) for (const group of buckets.values()) {
          const p = group[seed]; if (!p) continue;
          for (const dy of [-step.offset, 0, step.offset]) for (const dw of [-step.width, 0, step.width]) for (const dg of [-step.grid, 0, step.grid]) {
            const v = { ...p.variant, offset: rounded(p.variant.offset + dy), width: rounded(p.variant.width + dw), grid: rounded(p.variant.grid + dg) };
            if (v.offset < -30 || v.offset > 30 || v.width < .7 || v.width > 1.3 || v.grid < .94 || v.grid > 1.06) continue;
            evaluate(p.family, v, p.numbering);
          }
        }
      }
      if (!evaluated.some(p => !p.conflicts) && !budgetLimited && labelFamilies) {
        // Restart failed plateaus across the declared domain instead of staying around
        // one low-conflict seed. No oracle dimension or shape is supplied here.
        const sorted = [...evaluated].filter(p => !p.variant.mainOnly).sort(compare), minimum = sorted[0]?.conflicts ?? Infinity;
        const groups = new Map<string, PatternProposal>();
        for (const p of sorted) {
          if (p.conflicts > minimum + 1) continue;
          // Reversing reset/continuous numbers changes coordinates, but not label existence.
          // Physical anchors require both orientations to be searched separately.
          const directionKey = options.additional?.length || p.numbering.kind === "preserved" ? p.numbering.direction : "both";
          const key = `${p.family}:${p.numbering.kind}:${p.numbering.start}:${directionKey}`;
          if (!groups.has(key)) groups.set(key, p);
        }
        const recovery = inferenceV5Config.recovery;
        for (const p of groups.values()) for (const offset of recovery.offsets) for (const width of recovery.widths) for (const grid of recovery.grids) evaluate(p.family, { offset, width, grid }, p.numbering);
        for (const step of [{ offset: 6, width: .075, grid: .01 }, { offset: 3, width: .0375, grid: .005 }, { offset: 1.5, width: .01875, grid: .0025 }, { offset: .75, width: .009375, grid: .00125 }]) {
          rounds++;
          for (const p of groups.values()) {
            const seeds = [...evaluated].filter(e => e.family === p.family && e.numbering.kind === p.numbering.kind && e.numbering.direction === p.numbering.direction && !e.variant.mainOnly).sort(compare).slice(0, 2);
            for (const seed of seeds) for (const dy of [-step.offset,0,step.offset]) for (const dw of [-step.width,0,step.width]) for (const dg of [-step.grid,0,step.grid]) {
              const v = { offset: rounded(seed.variant.offset + dy), width: rounded(seed.variant.width + dw), grid: rounded(seed.variant.grid + dg) };
              if (v.offset < -30 || v.offset > 30 || v.width < .7 || v.width > 1.3 || v.grid < .94 || v.grid > 1.06) continue;
              evaluate(p.family, v, p.numbering);
            }
          }
        }
        if (!options.additional?.length) {
          // Restore the equivalent opposite orientation, preserving both possible seat positions.
          for (const p of [...evaluated].filter(p => !p.conflicts && p.numbering.kind !== "preserved")) {
            const opposite = rules.find(r => r.kind === p.numbering.kind && r.start === p.numbering.start && r.direction !== p.numbering.direction);
            if (opposite) evaluate(p.family, p.variant, opposite);
          }
        }
      }
      if (settings.independentGeometry !== false) {
        const seeds = [...evaluated].sort(compare).filter(p => !p.variant.mainOnly);
        const used = new Set<string>();
        for (const p of seeds) {
          const key = `${p.family}:${p.numbering.kind}:${p.numbering.direction}`;
          if (used.has(key)) continue; used.add(key);
          for (const delta of [-.15, .15]) evaluate(p.family, { ...p.variant, runwayWidth: rounded(p.variant.width + delta) }, p.numbering);
          for (const dx of [-6, 6]) evaluate(p.family, { ...p.variant, shiftX: dx }, p.numbering);
          if (p.family === "rear") for (const dy of [-12, 12]) evaluate(p.family, { ...p.variant, rearOffset: dy }, p.numbering);
        }
      }
      if (settings.jointRecovery !== false && !evaluated.some(p => !p.conflicts) && !budgetLimited && labelFamilies) {
        recoverJointGeometry([...searchPoints.values()], evaluate, Math.max(0, Math.min(2200, budget - evaluated.length - 32)), !!options.additional?.length);
        if (!options.additional?.length) for (const p of [...evaluated].filter(p => !p.conflicts && p.numbering.kind !== "preserved")) {
          const opposite = rules.find(r => r.kind === p.numbering.kind && r.start === p.numbering.start && r.direction !== p.numbering.direction);
          if (opposite) evaluate(p.family, p.variant, opposite);
        }
      }
    }
  }
  if (ranking === "v3") {
    // Retain exact v3 costs in the fixed-library comparison arm.
    for (const p of evaluated) {
      const cached = old?.evaluated.find(x => x.family === p.family && JSON.stringify(x.variant) === JSON.stringify(p.variant) && JSON.stringify(x.numbering) === JSON.stringify(p.numbering));
      if (cached) { p.cost = cached.cost; p.evidenceCost = cached.evidenceCost; p.regularization = cached.regularization; }
    }
  }
  evaluated.sort(compare);
  const compatible = evaluated.filter(p => !p.conflicts), best = compatible[0]?.cost ?? Infinity;
  for (const p of compatible) p.top = p.cost <= best + (ranking === "v3" ? .06 : inferenceV5Config.tieMargin);
  const top = compatible.filter(p => p.top), hasInput = indexed.length > 0 || !!options.census || !!options.additional?.length;
  if (top.length > 1 && ranking === "v5") {
    // A display representative must not be selected by family ID or proposal multiplicity.
    // Use the medoid of distinct structures; retain all tied alternatives and their disagreements.
    // With identical label support, ascending numbering is an authored display convention,
    // not evidence that the physical orientation was inferred. Never let a negative ID
    // choose a mirrored default; retain reverse alternatives in top/agreement.
    const groups = distinctProposals(top), addresses = checks.accepted.filter((_, i) => i % Math.max(1, Math.floor(checks.accepted.length / 24)) === 0).slice(0, 24);
    if (addresses.length && groups.length) {
      const vectors = groups.map(p => {
        const c = generateCandidateSeats(proposalLayout(p, analysis.eventId), p.numbering, addresses, true);
        return addresses.flatMap(a => {
          const point = c.byLabel.get(seatKey(a))?.[0]?.point;
          if (!point) return [600, 600, 600, 600];
          return [point.x, point.y, Math.min(600, ...c.layout.landmarks.filter(l => l.kind === "center").map(l => distanceToShape(l.shape, point))),
            Math.min(600, ...c.layout.landmarks.filter(l => l.kind === "runway").map(l => distanceToShape(l.shape, point)))];
        });
      });
      const distances = vectors.map(v => vectors.reduce((sum, other) => sum + v.reduce((s, n, i) => s + Math.abs(n - other[i]), 0) / v.length, 0));
      let representative = groups[distances.indexOf(Math.min(...distances))];
      if (settings.canonicalOrientation !== false && representative.numbering.direction === -1) {
        const normal = top.find(p => p.family === representative.family && JSON.stringify(p.variant) === JSON.stringify(representative.variant) && p.numbering.kind === representative.numbering.kind && p.numbering.start === representative.numbering.start && p.numbering.direction === 1);
        if (normal) representative = normal; // Keep shape/ranking unchanged; change the convention only.
      }
      const at = evaluated.findIndex(p => p.id === representative.id);
      evaluated.splice(at, 1); evaluated.unshift(representative);
    }
  }
  return { version: "v5", evaluated, top, reportCount: checks.accepted.length, heldCount: analysis.held.length, milliseconds: performance.now() - started,
    budgetLimited, state: !hasInput ? "no-evidence" : !compatible.length ? "needs-review" : analysis.held.length ? "held-input" : top.length > 1 ? "tied" : "proposal",
    basis: top.some(p => p.scoredRows) ? "reports" : new Set(compatible.map(p => p.historyCost)).size > 1 ? "history" : "template",
    failure: compatible.length ? "none" : !labelFamilies ? "unknown-labels" : budgetLimited ? "budget" : "no-compatible-sampled",
    diagnostics: { scoredRows: top[0]?.scoredRows ?? 0, distinctPositions: checks.accepted.length, families: labelFamilies, rounds, search, ranking } };
}

/** Distance to the physical boundary, independent of where the label was drawn. */
export function distanceToShape(shape: Shape, point: Point) {
  if (containsPoint(shape, point)) return 0;
  if (shape.kind === "circle") return Math.hypot(point.x - shape.center.x, point.y - shape.center.y) - shape.radius;
  return Math.min(...shape.points.map((a, i) => {
    const b = shape.points[(i + 1) % shape.points.length], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
  }));
}
function centroid(shape: Shape): Point {
  return shape.kind === "circle" ? shape.center : { x: shape.points.reduce((s, p) => s + p.x, 0) / shape.points.length, y: shape.points.reduce((s, p) => s + p.y, 0) / shape.points.length };
}
function relationGeometry(layout: ArenaLayout) {
  const main = layout.landmarks.find(l => l.kind === "main")!, origin = centroid(main.shape);
  const centers = layout.landmarks.filter(l => l.kind === "center");
  const primary = centers.find(l => l.id === "center") ?? centers[0];
  const axisEnd = primary ? centroid(primary.shape) : { x: layout.bounds.x + layout.bounds.width / 2, y: layout.bounds.y + layout.bounds.height / 2 };
  const len = Math.hypot(axisEnd.x - origin.x, axisEnd.y - origin.y) || 1;
  const axis = { x: (axisEnd.x - origin.x) / len, y: (axisEnd.y - origin.y) / len };
  const pitch = layout.blocks.flatMap(b => b.rows.flatMap(r => r.segments.map(s => Math.hypot(s.step.x, s.step.y)))).filter(d => d > 0).sort((a, b) => a - b);
  const unit = pitch[Math.floor(pitch.length / 2)] ?? Math.min(layout.bounds.width, layout.bounds.height) / 100;
  const paths = layout.landmarks.filter(l => l.kind === "runway");
  const corners = [{ x: layout.bounds.x, y: layout.bounds.y }, { x: layout.bounds.x + layout.bounds.width, y: layout.bounds.y }, { x: layout.bounds.x, y: layout.bounds.y + layout.bounds.height }, { x: layout.bounds.x + layout.bounds.width, y: layout.bounds.y + layout.bounds.height }];
  const depth = Math.max(...corners.map(p => (p.x - origin.x) * axis.x + (p.y - origin.y) * axis.y));
  return { main, origin, centers, axis, unit, paths, depth };
}
const relationCache = new WeakMap<ArenaLayout, ReturnType<typeof relationGeometry>>();
export function relationAtPointV5(layout: ArenaLayout, point: Point): Omit<RelativeSeatPosition, "mapped" | "point"> & { collision: boolean } {
  let geometry = relationCache.get(layout);
  if (!geometry) { geometry = relationGeometry(layout); relationCache.set(layout, geometry); }
  const { main, origin, centers, axis, unit, paths, depth } = geometry;
  const target = [...centers].sort((a, b) => distanceToShape(a.shape, point) - distanceToShape(b.shape, point) || a.id.localeCompare(b.id))[0];
  const center = target ? centroid(target.shape) : origin;
  const dx = point.x - center.x, dy = point.y - center.y, forward = dx * axis.x + dy * axis.y, lateral = dx * axis.y - dy * axis.x;
  const collision = layout.landmarks.some(l => containsPoint(l.shape, point));
  return { main: target ? distanceToShape(main.shape, point) < distanceToShape(target.shape, point) ? "メイン寄り" : "センステ寄り" : (point.x - origin.x) * axis.x + (point.y - origin.y) * axis.y < depth * .45 ? "メイン寄り" : "後方寄り",
    center: !target ? "なし" : Math.abs(lateral) > Math.abs(forward) ? "横側" : forward < 0 ? "前側" : "後ろ側",
    runway: !paths.length ? "なし" : !collision && paths.some(p => distanceToShape(p.shape, point) <= unit * 3) ? "花道の横" : "離れている", centerId: target?.id, collision };
}
export function proposalSeatRelationV5(candidate: SeatCandidate, address: SeatAddress) {
  const matches = candidate.byLabel.get(seatKey(address));
  if (matches?.length !== 1) return { mapped: false as const };
  return { mapped: true as const, point: matches[0].point, ...relationAtPointV5(candidate.layout, matches[0].point) };
}

/** Groups for the selector; all constituent top proposals remain available for agreement checks. */
export { distinctProposals } from "./proposalSelection";

/** Stream models and discard them. Thousands of complete arena grids must not stay in memory. */
export function proposalAgreement(proposals: PatternProposal[], eventId: string, addresses: SeatAddress[], onlyAll = false) {
  const agreements = addresses.map(() => ({ main: true, center: true, runway: true, position: true, all: true }));
  const references: ReturnType<typeof proposalSeatRelationV5>[] = [];
  for (const [index, proposal] of proposals.entries()) {
    const active = addresses.map((address, i) => ({ address, i })).filter(({ i }) => index === 0 || (onlyAll ? agreements[i].all : agreements[i].main || agreements[i].center || agreements[i].runway || agreements[i].position));
    if (!active.length) break;
    const candidate = generateCandidateSeats(proposalLayout(proposal, eventId), proposal.numbering, active.map(a => a.address), true);
    for (const { i, address } of active) {
      const relation = proposalSeatRelationV5(candidate, address);
      if (index === 0) references[i] = relation;
      const reference = references[i], agreement = agreements[i];
      if (!relation.mapped || !reference.mapped) { agreement.main = agreement.center = agreement.runway = agreement.position = agreement.all = false; continue; }
      agreement.main &&= relation.main === reference.main;
      agreement.center &&= relation.center === reference.center && relation.centerId === reference.centerId;
      agreement.runway &&= relation.runway === reference.runway;
      agreement.position &&= Math.hypot(relation.point.x - reference.point.x, relation.point.y - reference.point.y) <= (relationCache.get(candidate.layout)?.unit ?? 1) / 2;
      agreement.all = agreement.main && agreement.center && agreement.runway;
    }
    if (agreements.every(a => onlyAll ? !a.all : !a.main && !a.center && !a.runway && !a.position)) break;
  }
  return proposals.length ? agreements : agreements.map(() => ({ main: false, center: false, runway: false, position: false, all: false }));
}
