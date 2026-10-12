import { OUTSIDE_STATIONS, type OutsideStationId } from "./tokyoDomeOutsideGuide";
import type { DomeGuideMapZone, DomeGuideSpot } from "./tokyoDomeVisitorGuide";

// Station premises and adjacent City zones are separate members of a browsing
// scope. This does not assert a route, exit-to-locker distance, or free access.
export const TOKYO_STATION_SCOPES: Record<OutsideStationId, {
  zoneIds: readonly DomeGuideMapZone[]; memberIds: readonly string[];
}> = {
  "jr-west": { zoneIds: ["everyvalley", "yellow-building", "korakuen-hall"], memberIds: ["locker-station-suidobashi-jr", "locker-station-suidobashi-jr-west-inside"] },
  "jr-east": { zoneIds: ["meets-port", "gallery-aamo", "dome-hotel"], memberIds: ["locker-station-suidobashi-jr-east-inside"] },
  mita: { zoneIds: ["meets-port", "gallery-aamo"], memberIds: ["locker-station-suidobashi-mita"] },
  korakuen: { zoneIds: ["gate-25", "laqua"], memberIds: ["locker-station-korakuen-plus"] },
  kasuga: { zoneIds: ["laqua"], memberIds: ["locker-station-kasuga-a", "locker-station-kasuga-b"] },
};

export function tokyoStationScope(id: string | null) {
  const station = OUTSIDE_STATIONS.find(s => s.id === id);
  return station ? { ...TOKYO_STATION_SCOPES[station.id], label: `${station.name} ${station.exit}・駅と周辺` } : null;
}

export function inTokyoStationScope(spot: DomeGuideSpot, id: string | null) {
  const scope = tokyoStationScope(id);
  return !scope || (spot.area === "outside" && (scope.memberIds.includes(spot.id) || Boolean(spot.mapZone && scope.zoneIds.includes(spot.mapZone))));
}
