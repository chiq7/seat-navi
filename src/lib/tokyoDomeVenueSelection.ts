import { getTokyoDomeVerifiedSeatBlock } from "@/lib/tokyoDomeSeatLocator";

export const TOKYO_DOME_SEAT_SELECTION_EVENT = "tixrepo:tokyo-dome-seat-selection";

export type TokyoDomeVenueSeatSelection = {
  section: string;
  row: number | null;
  side: "first-base" | "third-base" | "center" | "left-field" | "right-field";
  floor: "4F" | "外野" | null;
};

/** Only the upper stand and outfield have a single documented concourse choice. */
export function getTokyoDomeVenueSeatSelection(
  section: string,
  row: number | null,
  label: readonly [number, number] | undefined,
): TokyoDomeVenueSeatSelection | null {
  if (!label) return null;
  const prefix = section[0];
  const verifiedBlock = getTokyoDomeVerifiedSeatBlock(section);
  const side = verifiedBlock
    ? ({ first: "first-base", home: "center", third: "third-base" } as const)[verifiedBlock.area]
    : prefix === "F"
    ? label[0] < 579 ? "left-field" : "right-field"
    : label[0] < 564 ? "third-base" : label[0] > 594 ? "first-base" : "center";
  return {
    section,
    row,
    side,
    floor: prefix === "D" || prefix === "E" ? "4F" : prefix === "F" ? "外野" : null,
  };
}

/** What the seat map is showing: a short name for it and its block codes, most relevant first. Empty when nothing is chosen. */
export type TokyoDomeMapScope = { label: string | null; codes: string[]; section?: string };
export const TOKYO_DOME_MAP_SCOPE_EVENT = "tixrepo:tokyo-dome-map-scope";
let currentMapScope: TokyoDomeMapScope = { label: null, codes: [] };
/** The seat map announces its scope; listeners that mount later read the latest one. */
export function announceTokyoDomeMapScope(scope: TokyoDomeMapScope) {
  currentMapScope = scope;
  window.dispatchEvent(new CustomEvent(TOKYO_DOME_MAP_SCOPE_EVENT, { detail: scope }));
}
export function readTokyoDomeMapScope() { return currentMapScope; }
