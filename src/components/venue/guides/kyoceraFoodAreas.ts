import type { FacilityMapPoint } from "@/lib/facilityMapGroups";

// Display areas along each floor's concourse, reviewed against the source diagram.
// These are nearby choices, not a shared shop entrance or a walking route.
// Membership stays the same across viewport sizes and cropped views.
const foodAreas: Record<string, { id: string; members: string[] }[]> = {
  "3F": [
    { id: "food-3f-upper-left", members: ["f3-shop-s15", "f3-shop-s16", "f3-shop-s17"] },
    { id: "food-3f-top", members: ["f3-shop-s18", "f3-shop-s19", "f3-jihanki-01"] },
    { id: "food-3f-upper-right", members: ["f3-shop-s20", "f3-shop-s21", "f3-shop-s22"] },
    { id: "food-3f-right", members: ["f3-shop-s29", "f3-shop-s30"] },
    { id: "food-3f-lower-right", members: ["f3-shop-s27", "f3-shop-s28", "f3-jihanki-03"] },
    { id: "food-3f-lower-left", members: ["f3-shop-s25", "f3-shop-s26", "f3-jihanki-02"] },
    { id: "food-3f-left", members: ["f3-shop-s23", "f3-shop-s24"] },
  ],
  "5F": [
    { id: "food-5f-top", members: ["f5-shop-s32", "f5-shop-s33", "f5-shop-s34"] },
    { id: "food-5f-left", members: ["f5-shop-s35", "f5-shop-s36"] },
    { id: "food-5f-right", members: ["f5-shop-s37", "f5-shop-s38"] },
    { id: "food-5f-bottom", members: ["f5-shop-s39", "f5-shop-s40"] },
  ],
};

export function groupKyoceraFoodAreas(points: FacilityMapPoint[], floor: string, referencePoints: FacilityMapPoint[] = points) {
  const definitions = foodAreas[floor] ?? [];
  const assigned = new Set(definitions.flatMap(area => area.members));
  // Keep future/unassigned food entries visible instead of silently dropping them.
  const areas = [...definitions, ...points.filter(point => !assigned.has(point.id)).map(point => ({ id: point.id, members: [point.id] }))];
  return areas.flatMap(area => {
    const members = points.filter(point => area.members.includes(point.id));
    if (!members.length) return [];
    const fixedMembers = referencePoints.filter(point => area.members.includes(point.id)).sort((a, b) => a.id.localeCompare(b.id));
    const position = fixedMembers.length ? fixedMembers : members;
    return [{ id: area.id, points: members, x: position.reduce((sum, point) => sum + point.x, 0) / position.length,
      y: position.reduce((sum, point) => sum + point.y, 0) / position.length,
      kinds: ["food"], columns: 1, width: 58, height: 60 }];
  });
}
