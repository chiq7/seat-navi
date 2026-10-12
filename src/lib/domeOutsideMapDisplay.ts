import type { DomeGuideSpot } from "../data/tokyoDomeVisitorGuide";
import { OUTSIDE_ZONES, OUTSIDE_GATE_GROUPS, OUTSIDE_STATIONS, OUTSIDE_MAP_SIZE } from "../data/tokyoDomeOutsideGuide";
import type { MapLabel } from "./facilityMapLabels";

export type OutsideFacilityKind = "mixed" | "accessible" | "locker" | "baby" | "atm" | "information" | "food";
export function outsideFacilityKind(spot: DomeGuideSpot): OutsideFacilityKind {
  if (spot.category === "locker") return "locker";
  if (spot.category === "food") return "food";
  if (spot.id.startsWith("toilet")) return spot.toiletTypes?.length === 1 && spot.toiletTypes[0] === "accessible" ? "accessible" : "mixed";
  if (spot.id.startsWith("baby")) return "baby";
  if (spot.id.startsWith("atm")) return "atm";
  return "information";
}
export function outsideFacilityGroups(spots: readonly DomeGuideSpot[]) {
  return OUTSIDE_ZONES.flatMap(zone => {
    const members = spots.filter(spot => spot.area === "outside" && spot.mapZone === zone.id);
    if (!members.length) return [];
    return [{ ...zone, members, kinds: [...new Set(members.map(outsideFacilityKind))] }];
  });
}
export function outsideMapLayout(spots: readonly DomeGuideSpot[], width: number, height: number) {
  // The independent schematic uses more vertical spacing on a phone so that
  // gate labels stay around the dome instead of being repacked across it.
  const scale = { x: (width - 20) / OUTSIDE_MAP_SIZE.width, y: (height - 60) / OUTSIDE_MAP_SIZE.height };
  const offset = { x: 10, y: 30 };
  const project = (x: number, y: number) => ({ x: offset.x + x * scale.x, y: offset.y + y * scale.y });
  const groups = outsideFacilityGroups(spots);
  const mergedZones: Record<string,string> = { g25:"gate-25",g21:"gate-21",g22:"gate-22" };
  const labels: MapLabel[] = [
    ...OUTSIDE_GATE_GROUPS.map(group => ({ id: group.id, kind: "gate" as const, ...project(group.x, group.y), width: group.gates.length > 1 ? width<315?60:66 : 46, height: group.gates.length > 2 ? 62 : 50, offset: { x: group.x < 350 ? -8 : 14, y:0 } })),
    ...OUTSIDE_STATIONS.map(station => ({ id: station.id, kind: "gate" as const, ...project(station.x, station.y), width: 80, height: 44,offset:station.id==="mita"?{x:-10,y:-30}:station.id==="jr-east"?{x:0,y:20}:undefined })),
    ...groups.filter(group=>!Object.values(mergedZones).includes(group.id)).map(group => ({ id: group.id, kind: "facility" as const, ...project(group.x, group.y), width: Math.max(78, group.short.length * 11 + 10), height: group.kinds.length > 3 ? 76 : 56 })),
  ];
  // Keep north/south and east/west ordering. Generic collision repacking can
  // put a southwest gate northeast of the dome and is unsuitable here.
  const placed=labels.map(label=>{
    let left=label.x+(label.offset?.x??0),top=label.y+(label.offset?.y??0);
    if(label.id==="yellow-building")left=width<500?55:left;
    if(label.id==="dome-hotel")left=width<500?width*.51:left;
    if(label.id==="meets-port"&&width<315)top-=42;
    // Leave room for the two locker areas without moving their map anchors.
    if(label.id==="jr-west"&&width<500)top=height-29;
    if(label.id==="everyvalley")top+=width<500?12:-10;
    if(label.id==="gallery-aamo"&&width<315)top-=6;
    if(label.id==="korakuen-hall")top+=16;
    if(label.id==="attractions")top+=12;
    if(label.id==="mita")top+=24;
    if(label.id==="g24")left-=8;
    if(label.id==="g23"){top-=5;if(width<500)left=width*.36;}
    left=Math.max(label.width/2+7,Math.min(width-label.width/2-7,left));
    top=Math.max(label.height/2+7,Math.min(height-label.height/2-7,top));
    return {...label,left,top};
  });
  return { groups, mergedZones, project, scale, offset, labels: placed };
}
