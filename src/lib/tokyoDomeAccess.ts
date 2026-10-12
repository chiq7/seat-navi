import { OUTSIDE_STATIONS } from "../data/tokyoDomeOutsideGuide";

export const TOKYO_DOME_ACCESS_EVENT = "tokyo-dome-open-station";

// The official table groups these stations within five minutes' walk.
// It gives no individual exit/gate travel times; do not derive them from the schematic.
export const TOKYO_DOME_STATION_WALKING = {
  label: "徒歩5分圏内",
  stationIds: ["jr-east", "jr-west", "mita", "korakuen", "kasuga"] as readonly string[],
  scope: "station-to-Tokyo-Dome area; no individual exit or entrance time",
  sourceUrl: "https://www.tokyo-dome.co.jp/dome/new-normal/pdf/access.pdf",
  sourceVersion: "2020.07",
  checkedAt: "2026-10-12",
} as const;

/** Match the railway and exit to the reviewed schematic, never the other Suidobashi. */
export function tokyoDomeAccessStation(line: string, exit: string) {
  return OUTSIDE_STATIONS.find(station => station.exit === exit && (line.startsWith("JR") ? station.id.startsWith("jr-") : station.line.includes(line.replace("東京メトロ", "").replace("丸ノ内線・南北線", "丸ノ内・南北線"))));
}
