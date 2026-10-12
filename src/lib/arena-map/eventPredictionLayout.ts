import { patternLayout, type PatternFamily, type PatternVariant } from "./historicalLayoutPatterns";
import type { PatternProposal } from "./patternInference";
import type { ArenaLayout } from "./layoutModel";

/** Unknown extents are finite hypotheses, not a transcription of the real seating chart. */
export type EventLayoutDefinition = {
  id: string;
  version: string;
  eventIds: string[];
  rows: number;
  columns: number;
};

const cache = new Map<string, ArenaLayout>();
export function eventPatternLayout(family: PatternFamily, eventId: string, variant: PatternVariant, definition?: EventLayoutDefinition): ArenaLayout {
  const base = patternLayout(family, eventId, variant);
  if (!definition) return base;
  if (!definition.eventIds.includes(eventId) || !Number.isSafeInteger(definition.rows) || !Number.isSafeInteger(definition.columns)
    || definition.rows < 1 || definition.rows > 80 || definition.columns < 1 || definition.columns > 200) throw new Error("Invalid event layout definition");
  const id = `${base.id}:event:${definition.id}:${definition.version}:${definition.rows}:${definition.columns}`;
  const key = JSON.stringify([id, [...definition.eventIds].sort()]);
  const cached = cache.get(key);
  if (cached) return cached;
  const blocks = base.blocks.map(block => {
    const xs = block.outline.map(p => p.x), ys = block.outline.map(p => p.y);
    const left = Math.min(...xs) + 2, right = Math.max(...xs) - 2;
    const top = Math.min(...ys) + 2, bottom = Math.max(...ys) - 2;
    return { ...block, rows: Array.from({ length: definition.rows }, (_, index) => ({
      label: String(index + 1), segments: [{ first: 1, last: definition.columns,
        origin: { x: left, y: top + index * (bottom - top) / Math.max(1, definition.rows - 1) },
        step: { x: (right - left) / Math.max(1, definition.columns - 1), y: 0 } }],
    })) };
  });
  const layout: ArenaLayout = { ...base, id, version: definition.version, label: "チケレポ予想", eventIds: [...definition.eventIds], blocks };
  if (cache.size >= 32) cache.delete(cache.keys().next().value!);
  cache.set(key, layout);
  return layout;
}

/** All consumers reconstruct the exact model searched, including numbering orientation. */
export function proposalLayout(proposal: PatternProposal, eventId: string) {
  return eventPatternLayout(proposal.family, eventId, proposal.variant, proposal.layoutDefinition);
}
