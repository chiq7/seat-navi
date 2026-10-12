import type { EventDaySummary } from "./eventDaySummary";

/** Venue geometry only. Points remain in each show's source-backed data. */
export const KYOCERA_OUTSIDE_MAP = {
  id: "kyocera-dome-outside", width: 660, height: 310,
  road: "M30 130 256 24",
  dome: { cx: 351, cy: 126, rx: 173, ry: 93 },
  innerDome: { cx: 351, cy: 126, rx: 150, ry: 70 },
  stationLabel: "JR大正駅側",
  // Annotation placement, not surveyed gate entrance coordinates.
  labels: [
    { id: "dome", lines: ["京セラドーム"], position: { left: "53.18%", top: "40.65%", transform: "translate(-50%,-50%)" }, x: 351, y: 126, anchor: "middle" },
    { id: "gate8", lines: ["8ゲート"], position: { left: "0", top: "30%" }, x: 0, y: 93, anchor: "start" },
    { id: "gate10", lines: ["10ゲート"], position: { left: "27%", top: "3%" }, x: 178.2, y: 9.3, anchor: "start" },
    { id: "gate6", lines: ["6ゲート"], position: { left: "0", top: "62%" }, x: 0, y: 192.2, anchor: "start" },
    { id: "entry", lines: ["1・14", "ゲート"], position: { right: "0", top: "42%" }, x: 660, y: 130.2, anchor: "end" },
    { id: "plaza", lines: ["中央プラザ"], position: { left: "50%", bottom: "12%", transform: "translateX(-50%)" }, x: 330, y: 260, anchor: "middle" },
  ],
} as const;

export const EVENT_DAY_GATE_NOTE = "入場ゲートはチケットの指定を確認";

/** Layout endpoints are callouts, not new locations, routes or measured coordinates. */
export function getEventDayMap(day: EventDaySummary) {
  if (day.venueMapId !== KYOCERA_OUTSIDE_MAP.id) return null;
  const valid = day.booths.filter(b => b.map?.venueMapId === day.venueMapId &&
    Number.isFinite(b.map.x) && Number.isFinite(b.map.y) &&
    b.map.x >= 0 && b.map.x <= 1 && b.map.y >= 0 && b.map.y <= 1);
  const byPosition = (a: typeof valid[number], b: typeof valid[number]) => a.map!.x - b.map!.x || a.id.localeCompare(b.id);
  const top = valid.filter(b => b.map!.y < .3).sort(byPosition);
  const bottom = valid.filter(b => b.map!.y >= .3).sort(byPosition);
  const makePins = (booths: typeof valid, side: "top" | "bottom") => booths.map((booth, i) => ({
    booth, side,
    point: { x: 30 + booth.map!.x * 600, y: 10 + booth.map!.y * 240 },
    // Top-left is the station label; lower callouts span the full width.
    callout: { x: side === "top" ? 330 + (i + .5) * 330 / booths.length : (i + .5) * 660 / booths.length,
      y: side === "top" ? 0 : 310 },
  }));
  return { base: KYOCERA_OUTSIDE_MAP, top: makePins(top, "top"), bottom: makePins(bottom, "bottom") };
}
