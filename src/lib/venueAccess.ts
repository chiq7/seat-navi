import type { DedicatedVenueGuide } from "../data/venueGuides/types";
import targets from "../data/venueGuides/access-targets.json";

export const VENUE_ACCESS_EVENT = "venue-guide-open-access";
export type VenueAccessEntry = { id: string; from: string; exit: string; line: string; time: string; sourceUrl: string; targetId?: string; diagramId?: string };
export type VenueAccessDetail = { venueId: string; targetId: string; diagramId: string };

/** Explicit reviewed landmark IDs, never a nearest-coordinate or first-name match. */
export function accessTarget(guide: DedicatedVenueGuide, origin: Pick<VenueAccessEntry,"from"|"line"|"exit">) {
  const id = (targets as Record<string, (Pick<VenueAccessEntry,"from"|"line"|"exit"> & {targetId:string|null})[]>)[guide.venueId]
    ?.find(entry => entry.from === origin.from && entry.line === origin.line && entry.exit === origin.exit)?.targetId;
  const diagram = id ? guide.diagrams?.find(d => d.scope === "場外" && d.landmarks.some(m => m.id === id)) : undefined;
  return diagram && id ? { targetId: id, diagramId: diagram.id } : {};
}

export function splitAccessText(text: string) {
  const slash = text.indexOf("／");
  if (slash >= 0 && /出口|改札|口|バス乗り場/.test(text.slice(slash + 1))) return { line: text.slice(0, slash), exit: text.slice(slash + 1) };
  const separator = text.search(/[・]/);
  if (separator >= 0 && /(?:西口|東口|南口|北口|出口)$/.test(text)) return { line: text.slice(0, separator), exit: text.slice(separator + 1) };
  return /(?:出口|改札|[東西南北]口)$/.test(text) ? { line: "", exit: text } : { line: text, exit: "" };
}

export function arenaAccessEntries(guide: DedicatedVenueGuide, rows: string[][], sourceUrl: string): VenueAccessEntry[] {
  const expanded = rows.flatMap(([from, text, time]) => {
    const parts = splitAccessText(text);
    const exits = parts.exit === "西口/東口" ? ["西口", "東口"] : parts.exit === "出口7・8" ? ["出口7", "出口8"] : [parts.exit];
    return exits.map(exit => ({ from, ...parts, exit, time }));
  });
  return expanded.map((row, index) => ({ ...row, id: `${guide.venueId}-${index}`, sourceUrl, ...accessTarget(guide, row) }));
}
