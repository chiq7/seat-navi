import type { GuideFacility } from "@/data/venueGuides/types";

export const BABY_FACILITY_SEARCH = {
  nursing: { label: "授乳室", terms: ["授乳室", "授乳", "授乳スペース", "授乳ブース"] },
  "baby-room": { label: "ベビールーム", terms: ["ベビールーム", "ベビーケアルーム", "赤ちゃん休憩室"] },
  diaper: { label: "おむつ替え", terms: ["おむつ替え", "おむつ交換", "おむつ交換台", "おむつ替え台", "オムツ替え", "オムツ交換"] },
} as const;

export type BabyFacilitySearch = keyof typeof BABY_FACILITY_SEARCH;
export type VenueFacilitySearchTarget = "luggage" | "baby" | BabyFacilitySearch;

export function isBabyFacilitySearch(value: string): value is BabyFacilitySearch {
  return Object.hasOwn(BABY_FACILITY_SEARCH, value);
}

export function matchesBabyFacilitySearch(
  target: BabyFacilitySearch,
  name: string,
  detail: string,
  kind?: string,
): boolean {
  if (target === "baby-room") return /ベビー(?:ケア)?ルーム|ベビー休憩|赤ちゃん(?:ルーム|休憩)|mamaro/i.test(name);
  if (target === "diaper" && /^(?:diaper|diaper-table)$/.test(kind ?? "")) return true;
  const term = target === "nursing" ? /授乳/ : /おむつ(?:替え|換え|交換)|オムツ(?:替え|換え|交換)|ベビーシート/;
  if (term.test(name)) return true;
  return detail.split(/[。\n]/).some(sentence => term.test(sentence)
    && !/(?:なし|なく|ありません|未確認|不明|設置有無|利用不可|各エリアの.*トイレ)/.test(sentence));
}
export function matchesGuideBabyFacility(target: BabyFacilitySearch, facility: GuideFacility): boolean {
  return facility.sourceIds.length > 0
    && (facility.purpose === "赤ちゃん" || (target === "diaper" && facility.purpose === "トイレ"))
    && matchesBabyFacilitySearch(target, facility.name, facility.detail, facility.kind);
}
