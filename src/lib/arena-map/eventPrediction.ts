import { inferPatternLayoutsV5, inferenceV5Config, type PredictionV5 } from "./patternInferenceV5";
import type { EventPredictionInput } from "./eventPredictionInput";

/** One bounded, shared calculation. Synthetic fixtures never enter this entry point. */
export function inferEventPrediction(input: EventPredictionInput): PredictionV5 {
  const started = performance.now();
  if (input.state !== "ready") throw new Error(`Prediction input is ${input.state}`);
  const results = input.definitions.map(layoutDefinition => inferPatternLayoutsV5(input.analysis,
    { layoutDefinition }, {}, { families: ["rear", "square", "round"], maxCandidates: 1200,
      refinements: input.analysis.accepted.length > 3 }));
  const evaluated = results.flatMap(result => result.evaluated).sort((a, b) => a.conflicts - b.conflicts || a.cost - b.cost || a.id.localeCompare(b.id));
  const compatible = evaluated.filter(proposal => proposal.conflicts === 0);
  const best = compatible[0]?.cost ?? Infinity;
  for (const proposal of evaluated) proposal.top = proposal.conflicts === 0 && proposal.cost <= best + inferenceV5Config.tieMargin;
  const top = evaluated.filter(proposal => proposal.top);
  // Ascending orientation is a display convention; the opposite stays selectable.
  const representative = top.find(proposal => proposal.numbering.direction === 1) ?? top[0];
  if (representative) { evaluated.splice(evaluated.indexOf(representative), 1); evaluated.unshift(representative); }
  const first = results[0];
  return { ...first, evaluated, top, milliseconds: performance.now() - started,
    budgetLimited: results.some(result => result.budgetLimited),
    state: !compatible.length ? "needs-review" : input.analysis.held.some(item => item.reason !== "other-event") ? "held-input" : top.length > 1 ? "tied" : "proposal",
    basis: top.some(proposal => proposal.scoredRows > 0) ? "reports" : "template",
    failure: compatible.length ? "none" : results.some(result => result.budgetLimited) ? "budget" : "no-compatible-sampled" };
}
