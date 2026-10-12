import type { DomeGuideMapZone } from "./tokyoDomeVisitorGuide";

export const OUTSIDE_CHECKED_AT = "2026-09-29";
export const OUTSIDE_EVIDENCE = {
  city: "https://www.tokyo-dome.co.jp/guest/pdf/citymap.pdf",
  gates: "https://www.tokyo-dome.co.jp/dome/seat/pdf/gate_guide.pdf",
  access: "https://www.tokyo-dome.co.jp/dome/access/",
  services: "https://www.tokyo-dome.co.jp/guide/",
  child: "https://www.tokyo-dome.co.jp/guide/child.html",
  laqua: "https://www.laqua.jp/shops-restaurants/service/",
} as const;

// Independent schematic, not surveyed coordinates. Relationships were checked
// against the city PDF and exterior gate diagram. Building pins denote the
// building, not a verified individual shop/room entrance.
export const OUTSIDE_MAP_SIZE = { width: 1000, height: 1250 };
export type OutsidePoint = { x: number; y: number };
export type OutsideZone = OutsidePoint & { id: DomeGuideMapZone; label: string; short: string; scope: "building" | "named-location" };
export const OUTSIDE_ZONES: readonly OutsideZone[] = [
  { id: "gate-25", x: 210, y: 265, label: "25ゲート横", short: "25G横", scope: "named-location" },
  { id: "gate-21", x: 620, y: 560, label: "21ゲート前", short: "21G前", scope: "named-location" },
  { id: "gate-22", x: 530, y: 730, label: "22ゲート前", short: "22G前", scope: "named-location" },
  { id: "laqua", x: 650, y: 180, label: "ラクーア", short: "ラクーア", scope: "building" },
  { id: "korakuen-hall", x: 280, y: 850, label: "後楽園ホールビル", short: "後楽園ホール", scope: "building" },
  { id: "attractions", x: 810, y: 640, label: "ジオポリス", short: "ジオポリス", scope: "building" },
  { id: "yellow-building", x: 240, y: 1020, label: "黄色いビル", short: "黄色いビル", scope: "building" },
  { id: "dome-hotel", x: 650, y: 1010, label: "東京ドームホテル", short: "ドームホテル", scope: "building" },
  { id: "meets-port", x: 890, y: 1000, label: "ミーツポート", short: "ミーツポート", scope: "building" },
  // Locker operator map: named-area anchors, not individual locker entrances.
  { id: "everyvalley", x: 430, y: 1100, label: "ハイ！エブリバレー", short: "エブリバレー", scope: "named-location" },
  { id: "gallery-aamo", x: 825, y: 830, label: "Gallery AaMo〜水道橋A3出口付近", short: "AaMo・A3側", scope: "named-location" },
];

export const OUTSIDE_GATE_GROUPS = [
  { id: "g25", x: 230, y: 295, gates: ["25"], side: "後楽園駅側" },
  { id: "g11", x: 110, y: 500, gates: ["11"], side: "小石川後楽園側" },
  { id: "g20", x: 550, y: 410, gates: ["20", "30", "40"], side: "ラクーア側" },
  { id: "g21", x: 580, y: 550, gates: ["21", "31"], side: "アトラクションズ側" },
  { id: "g22", x: 490, y: 720, gates: ["22"], side: "ホーム側" },
  { id: "g23", x: 350, y: 760, gates: ["23"], side: "後楽園ホール側" },
  { id: "g24", x: 190, y: 710, gates: ["24", "33", "41"], side: "小石川後楽園側" },
] as const;

export const OUTSIDE_GATES = OUTSIDE_GATE_GROUPS.flatMap(group => group.gates.map(number => ({
  number, group: group.id, side: group.side, x: group.x, y: group.y,
  level: number.startsWith("4") ? "4F" : number.startsWith("3") ? "3F" : ["11", "25"].includes(number) ? "1F" : "2F",
  positionStatus: "reconstructed" as const,
  sources: [OUTSIDE_EVIDENCE.city, OUTSIDE_EVIDENCE.gates],
})));
// 32 is printed on the seating PDF but absent from the current exterior guide.
// Do not invent an exterior stair/entry for it.
export const OUTSIDE_UNLOCATED_GATES = [{ number: "32", reason: "場外の入口位置は確認中" }] as const;

export const OUTSIDE_STATIONS = [
  { id: "jr-west", name: "JR水道橋", exit: "西口", line: "JR中央・総武線", x: 380, y: 1180, join: "g22", via: "後楽園ブリッジ方面", points: [[380,1180],[380,1110],[400,960],[415,830],[490,720]], warning: "西口はエレベーターなし" },
  { id: "jr-east", name: "JR水道橋", exit: "東口", line: "JR中央・総武線", x: 790, y: 1180, join: "g21", via: "ミーツポート・外周方面", points: [[790,1180],[890,1100],[840,850],[725,725],[630,630],[580,550]] },
  { id: "mita", name: "都営水道橋", exit: "A2出口", line: "都営三田線", x: 950, y: 1120, join: "g21", via: "ミーツポート・外周方面", points: [[950,1120],[890,1100],[840,850],[725,725],[630,630],[580,550]] },
  { id: "korakuen", name: "後楽園", exit: "2番出口", line: "丸ノ内・南北線", x: 200, y: 125, join: "g25", via: "ドーム外周方面", points: [[200,125],[200,190],[230,295]] },
  { id: "kasuga", name: "春日", exit: "6番出口", line: "都営大江戸線", x: 820, y: 60, join: "g20", via: "ラクーア・外周方面", points: [[820,60],[800,270],[710,350],[630,385],[550,410]] },
] as const;
export type OutsideStationId = typeof OUTSIDE_STATIONS[number]["id"];

export const OUTSIDE_POSITION_REVIEW = {
  stations: { namesAndExits:"verified", coordinates:"area-reconstruction", source:OUTSIDE_EVIDENCE.access },
  gates: { numbersAndRelativeSides:"verified", coordinates:"area-reconstruction", source:OUTSIDE_EVIDENCE.gates },
  buildings: { relativePlacement:"verified", coordinates:"area-reconstruction", source:OUTSIDE_EVIDENCE.city },
  equipment: { floorAndBuilding:"verified-listed", individualEntranceCoordinates:"unconfirmed" },
  connectingLines: { status:"schematic-only", metres:null, minutes:null, stepFree:false },
} as const;

// Walkway centre-lines are schematic reconstructions of the paths between
// the mapped landmarks. They do not carry metres, minutes, or accessibility.
export const OUTSIDE_RING = ["g25", "g20", "g21", "g22", "g23", "g24", "g11"] as const;
export const OUTSIDE_RING_EDGES = [
  { from:"g25",to:"g20",points:[[230,295],[340,270],[465,295],[540,350],[550,410]] },
  { from:"g20",to:"g21",points:[[550,410],[590,455],[600,505],[580,550]] },
  { from:"g21",to:"g22",points:[[580,550],[580,620],[555,680],[490,720]] },
  { from:"g22",to:"g23",points:[[490,720],[425,760],[350,760]] },
  { from:"g23",to:"g24",points:[[350,760],[260,760],[190,710]] },
  { from:"g24",to:"g11",points:[[190,710],[130,650],[100,580],[110,500]] },
  { from:"g11",to:"g25",points:[[110,500],[100,415],[135,340],[230,295]] },
] as const;
export function outsideRoute(stationId: string | null, gateNumber: string | null) {
  const station = OUTSIDE_STATIONS.find(item => item.id === stationId);
  const gate = OUTSIDE_GATES.find(item => item.number === gateNumber);
  if (!station || !gate) return null;
  const start = OUTSIDE_RING.indexOf(station.join);
  const end = OUTSIDE_RING.indexOf(gate.group);
  const clockwise = (end - start + OUTSIDE_RING.length) % OUTSIDE_RING.length;
  const counter = (start - end + OUTSIDE_RING.length) % OUTSIDE_RING.length;
  const direction = clockwise <= counter ? 1 : -1;
  const hops = Math.min(clockwise, counter);
  const groups = Array.from({length:hops+1},(_,index)=>OUTSIDE_GATE_GROUPS.find(item=>item.id===OUTSIDE_RING[(start+direction*index+OUTSIDE_RING.length)%OUTSIDE_RING.length])!);
  const points: OutsidePoint[] = station.points.map(([x,y])=>({x,y}));
  for(let index=1;index<groups.length;index++) {
    const edge=OUTSIDE_RING_EDGES.find(item=>(item.from===groups[index-1].id&&item.to===groups[index].id)||(item.to===groups[index-1].id&&item.from===groups[index].id))!;
    const path=edge.from===groups[index-1].id?[...edge.points]:[...edge.points].reverse();
    points.push(...path.slice(1).map(([x,y])=>({x,y})));
  }
  return { station, gate, points, groups, status: "schematic" as const, accessible: false as const };
}
