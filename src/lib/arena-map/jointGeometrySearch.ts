import type { PatternVariant, PatternFamily } from "./historicalLayoutPatterns";
import type { PatternProposal } from "./patternInference";

type SearchPoint = PatternProposal & { gap: number };
const axes = ["offset", "width", "grid", "runwayWidth", "shiftX", "rearOffset"] as const;
const bounds = [[-30,30],[.7,1.3],[.94,1.06],[.7,1.3],[-12,12],[-24,24]] as const;
const compare = (a: SearchPoint, b: SearchPoint) => a.gap - b.gap || a.conflicts - b.conflicts || a.cost - b.cost || a.id.localeCompare(b.id);
const value = (v: PatternVariant, axis: typeof axes[number]) => v[axis] ?? (axis === "runwayWidth" ? v.width : 0);
const clamp = (v: number, axis: number) => Number(Math.max(bounds[axis][0], Math.min(bounds[axis][1], v)).toFixed(6));
function halton(index: number, base: number) {
  let fraction = 1, result = 0;
  while (index) { fraction /= base; result += fraction * (index % base); index = Math.floor(index / base); }
  return result;
}
const primes = [2,3,5,7,11,13];
function beam(points: SearchPoint[], steps: readonly number[], limit = 8) {
  const kept: SearchPoint[] = [];
  for (const p of points.sort(compare)) {
    if (kept.some(q => axes.reduce((sum, axis, i) => sum + ((value(p.variant, axis) - value(q.variant, axis)) / steps[i]) ** 2, 0) < .4)) continue;
    kept.push(p); if (kept.length === limit) break;
  }
  return kept;
}

/** Bounded derivative-free search over joint edits, using label distances only.
 * Plateaus are not discarded by a binary conflict count. No truth shape/seat/count enters here.
 * A finite budget is explicit; this is not a completeness claim over a continuous domain.
 */
export function recoverJointGeometry(initial: SearchPoint[], evaluate: (family: PatternFamily, variant: PatternVariant, rule: PatternProposal["numbering"]) => SearchPoint | undefined, maxEvaluations = 2000, separateDirections = false) {
  let calls = 0;
  const groups = new Map<string, SearchPoint[]>();
  for (const p of initial.filter(p => !p.variant.mainOnly).sort(compare)) {
    const key = `${p.family}:${p.numbering.kind}:${p.numbering.start}:${separateDirections || p.numbering.kind === "preserved" ? p.numbering.direction : "both"}`;
    const group = groups.get(key) ?? []; group.push(p); groups.set(key, group);
  }
  // Round-robin group quotas prevent a family listed first from consuming the recovery budget.
  const selected = [...groups.values()].filter(g => g[0].gap <= (initial.sort(compare)[0]?.gap ?? 0) + 3);
  const quota = Math.floor(maxEvaluations / Math.max(1, selected.length));
  for (const group of selected) {
    const family = group[0].family, rule = group[0].numbering;
    const activeAxes = axes.map((_, i) => i).filter(i => i !== 5 || family === "rear");
    let localCalls = 0;
    const points = [...group], found: SearchPoint[] = [];
    const visit = (variant: PatternVariant) => {
      if (localCalls >= quota) return;
      calls++; localCalls++;
      const point = evaluate(family, variant, rule);
      if (point) { points.push(point); if (!point.conflicts) found.push(point); }
    };
    const startSteps = [12,.15,.03,.15,8,12];
    const starts = beam(points, startSteps);
    // Space-filling joint restarts around several *different* failed seeds.
    for (let i = 1; i <= 128; i++) {
      const p = starts[(i - 1) % starts.length], variant = { ...p.variant };
      for (const axis of activeAxes) variant[axes[axis]] = clamp(value(p.variant, axes[axis]) + (halton(i, primes[axis]) * 2 - 1) * startSteps[axis], axis);
      visit(variant);
    }
    for (let level = 0; level < 5 && localCalls < quota; level++) {
      const steps = startSteps.map(step => step / 2 ** level);
      const seeds = beam(points, steps);
      for (const p of seeds) {
        // Both single and paired moves cross seat-count boundaries without requiring
        // an improving intermediate point along either coordinate alone.
        for (const a of activeAxes) for (const delta of [-1,1]) {
          visit({ ...p.variant, [axes[a]]: clamp(value(p.variant, axes[a]) + delta * steps[a], a) });
        }
        for (let i = 0; i < activeAxes.length; i++) for (let j = i + 1; j < activeAxes.length; j++) for (const da of [-1,1]) for (const db of [-1,1]) {
          const a = activeAxes[i], b = activeAxes[j];
          visit({ ...p.variant, [axes[a]]: clamp(value(p.variant, axes[a]) + da * steps[a], a), [axes[b]]: clamp(value(p.variant, axes[b]) + db * steps[b], b) });
        }
      }
      if (found.length >= 4) break;
    }
  }
  return calls;
}
