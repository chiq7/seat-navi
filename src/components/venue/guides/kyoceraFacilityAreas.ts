import type { FacilityMapPoint } from "@/lib/facilityMapGroups";
import { groupKyoceraFoodAreas } from "./kyoceraFoodAreas";

// Display areas reviewed against the floor diagram. Membership describes nearby
// choices along the concourse, not a shared entrance or a verified walking route.
// Keep the same membership when a purpose/type filter or viewport changes.
const areas: Record<string, { id: string; members: string[] }[]> = {
  "2F:トイレ": [
    { id: "toilet-2f-north-side", members: ["f2-toiletfe-01", "f2-toilethc-02"] },
  ],
  "2F:案内": [
    { id: "info-2f-south-east", members: ["f2-ele1to3-04", "f2-elesh-02"] },
    { id: "info-2f-south-north", members: ["f2-ele1to3-03", "f2-mbr-01"] },
    { id: "info-2f-east-entrance", members: ["f2-ele1to3-06", "f2-esca-03", "f2-esca-04"] },
    { id: "info-2f-east-lower", members: ["f2-ele1to3-01", "f2-esca-01", "f2-esca-02"] },
    { id: "info-2f-east-lobby", members: ["f2-if-01", "f2-elesh-01"] },
    { id: "info-2f-north-lobby", members: ["f2-elesh-03", "f2-mbr-03"] },
  ],
  "3F:トイレ": [
    { id: "toilet-3f-top", members: ["f3-toiletma-02", "f3-toilethc-05", "f3-toiletfe-02", "f3-toilethc-06"] },
    { id: "toilet-3f-upper-left", members: ["f3-toilethc-04", "f3-toilet-02"] },
    { id: "toilet-3f-left", members: ["f3-toilethc-02", "f3-toiletma-01", "f3-toilethc-03", "f3-toiletfe-01"] },
    { id: "toilet-3f-lower-left", members: ["f3-toilethc-01", "f3-toilet-01"] },
    { id: "toilet-3f-upper-right", members: ["f3-toilet-03", "f3-toilethc-09"] },
    { id: "toilet-3f-right", members: ["f3-toilethc-07", "f3-toiletfe-03", "f3-toilethc-08", "f3-toiletma-03"] },
    { id: "toilet-3f-lower-right", members: ["f3-toilethc-10", "f3-toilet-04"] },
  ],
  "5F:トイレ": [
    { id: "toilet-5f-top", members: ["f5-toiletma-02", "f5-toiletfe-02"] },
    { id: "toilet-5f-upper-left", members: ["f5-toilethc-04", "f5-toilet-02"] },
    { id: "toilet-5f-lower-left", members: ["f5-toilethc-01", "f5-toilet-01"] },
    { id: "toilet-5f-upper-right", members: ["f5-toilet-03", "f5-toilethc-09"] },
    { id: "toilet-5f-lower-right", members: ["f5-toilethc-10", "f5-toilet-04"] },
    { id: "toilet-5f-bottom", members: ["f5-toiletfe-03", "f5-toiletma-03"] },
  ],
  "3F:案内": [
    { id: "info-3f-top", members: ["f3-ele1to3-03", "f3-ele1to3-04", "f3-tkt-sell-01", "f3-mbr-01"] },
    { id: "info-3f-left", members: ["f3-ele3and5-01", "f3-eleug-01"] },
    { id: "info-3f-right", members: ["f3-ele3and5-02", "f3-eleug-02"] },
    { id: "info-3f-lower-right", members: ["f3-tkt-sell-02", "f3-mbr-04"] },
    { id: "info-3f-bottom-right", members: ["f3-ele1to3-02", "f3-mbr-03", "f3-info"] },
    { id: "info-3f-bottom", members: ["f3-ele1to3-01", "f3-esca-01", "f3-tkt-sell-04", "f3-phone"] },
    { id: "info-3f-lower-left", members: ["f3-esca-02", "f3-tkt-sell-03", "f3-mbr-02"] },
  ],
  "場外:案内": [
    { id: "info-outside-bottom", members: ["outside-ticket-2", "outside-phone"] },
  ],
};

export function groupKyoceraFacilityAreas(points: FacilityMapPoint[], floor: string, purpose: string, scope: string, referencePoints: FacilityMapPoint[] = points) {
  if (scope === "場内" && purpose === "飲食") return groupKyoceraFoodAreas(points, floor, referencePoints);
  const definitions = areas[`${scope === "場外" ? scope : floor}:${purpose}`] ?? [];
  const assigned = new Set(definitions.flatMap(area => area.members));
  // Unassigned or isolated facilities retain their own sign. Never omit them to
  // hit an icon count, or combine opposite sides merely because a category is sparse.
  const definitionsWithSingles = [...definitions, ...points.filter(point => !assigned.has(point.id)).map(point => ({ id: point.id, members: [point.id] }))];
  return definitionsWithSingles.flatMap(area => {
    const members = points.filter(point => area.members.includes(point.id));
    if (!members.length) return [];
    const fixedMembers = referencePoints.filter(point => area.members.includes(point.id)).sort((a, b) => a.id.localeCompare(b.id));
    const position = fixedMembers.length ? fixedMembers : members;
    return [{ id: area.id, points: members,
      x: position.reduce((sum, point) => sum + point.x, 0) / position.length,
      y: position.reduce((sum, point) => sum + point.y, 0) / position.length,
      kinds: [...new Set(members.map(point => point.kind ?? point.id))], columns: 1, width: 44, height: 44 }];
  });
}
