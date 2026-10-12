import type { DomeGuideSpot, GuideFloor } from "../data/tokyoDomeVisitorGuide";

export type DomeGuidePurpose = "all" | "toilet" | "locker" | "food" | "baby" | "help" | "aed";

// Category is filtered separately. Reuse this rule for results and floor availability.
export function matchesDomeGuidePurpose(item: DomeGuideSpot, purpose: DomeGuidePurpose) {
  if (purpose === "toilet") return item.id.startsWith("toilet");
  if (purpose === "baby") return item.id.startsWith("baby");
  if (purpose === "aed") return /AED/i.test(item.name);
  if (purpose === "help") return !item.id.startsWith("toilet") && !item.id.startsWith("baby") && !/AED/i.test(item.name);
  return true;
}

export function availableDomeGuideFloors(rows: readonly DomeGuideSpot[]): GuideFloor[] {
  return [...new Set(rows.filter((item) => item.area === "inside" && item.floor !== "各階").map((item) => item.floor))];
}
