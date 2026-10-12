import { OUTSIDE_STATIONS } from "../data/tokyoDomeOutsideGuide";

export const TOKYO_DOME_ACCESS_EVENT = "tokyo-dome-open-station";

/** Match the railway and exit to the reviewed schematic, never the other Suidobashi. */
export function tokyoDomeAccessStation(line: string, exit: string) {
  return OUTSIDE_STATIONS.find(station => station.exit === exit && (line.startsWith("JR") ? station.id.startsWith("jr-") : station.line.includes(line.replace("東京メトロ", "").replace("丸ノ内線・南北線", "丸ノ内・南北線"))));
}
