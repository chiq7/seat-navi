import type { PatternProposal } from "./patternInference";

/** Lightweight selector grouping. The full top set is retained by the inference result. */
export function distinctProposals(proposals: PatternProposal[]) {
  const groups = new Map<string, PatternProposal>();
  for (const p of proposals) {
    const key = `${p.family}:${!!p.variant.mainOnly}:${p.numbering.kind}:${p.numbering.direction}${p.layoutDefinition ? `:${p.layoutDefinition.id}:${p.layoutDefinition.version}:${p.layoutDefinition.rows}:${p.layoutDefinition.columns}` : ""}`;
    if (!groups.has(key)) groups.set(key, p);
  }
  return [...groups.values()];
}
