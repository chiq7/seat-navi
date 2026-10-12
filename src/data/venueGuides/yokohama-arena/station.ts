import type { FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { GuideDiagram, GuideFacility } from "../types";

const diagramId = "ya-station-B1";
const sourceIds = ["ya-tokyu-station"];
// Coordinates belong to the linked 2500 × 1146 station plan, not the venue map.
// Only the functional outlines and symbol centres are transcribed; no route is inferred.
export const yokohamaStationDiagram: GuideDiagram = {
  id: diagramId, scope: "場外", floor: "駅B1F", viewBox: [250, 200, 1900, 830], concoursePaths: [],
  contextPaths: [
    "M304 538L591 512L1080 507L1080 411L974 435L798 435L798 330L1090 330L1095 235L1285 235L1271 416L1346 341L1378 367L1280 484L1263 484L1263 504L1658 504L1658 260L1748 260L1748 510L2137 544L2137 593L2107 598L2107 752L1506 790L1482 948L1443 948L1443 792L1239 792L1226 1007L1036 1007L1049 827L922 865L922 920L541 920L541 778L304 759Z",
    "M591 512L916 508L916 605L899 605L899 702L926 702L926 778L837 778L837 807L541 807L541 778L304 759L304 538Z",
    "M1506 562L1827 562L1827 601L1663 601L1663 745L1604 745L1604 721L1506 721Z",
    "M467 549L591 544L591 644L467 644Z",
    "M1663 602L1833 602L1833 703L1663 703Z",
  ],
  landmarks: [
    { id: "ya-station-exit-7", label: "出口7", name: "新横浜駅 出口7・横浜アリーナ方面", kind: "exit", x: 1695, y: 266, sourceIds, reference: "B1Fから地上へ上がる出口7の階段側。会場の入場口ではない。" },
    { id: "ya-station-exit-8", label: "出口8", name: "新横浜駅 出口8・横浜アリーナ方面", kind: "exit", x: 1353, y: 356, sourceIds, reference: "B1F平面図の出口8の通路端。地上の出口位置へ座標を転用しない。" },
    { id: "ya-station-exit-5B", label: "出口5B", name: "新横浜駅 出口5B・JR駅方面", kind: "exit", x: 795, y: 905, sourceIds, reference: "B1F平面図の出口5B階段側。隣のEV cは歩行者デッキへ。" },
    { id: "ya-station-exit-9", label: "出口9", name: "新横浜駅 出口9・日産スタジアム方面", kind: "exit", x: 924, y: 416, sourceIds, reference: "B1F平面図の出口9階段側。" },
    { id: "ya-station-north-gate", label: "北改札", kind: "gate", x: 1504, y: 651, sourceIds, reference: "相鉄・東急新横浜線B1F北改札の境界。会場のゲートではない。" },
    { id: "ya-station-south-gate-A", label: "南改札A", kind: "gate", x: 907, y: 651, sourceIds, reference: "B1F南改札Aの境界。南改札Bと一つにまとめない。" },
    { id: "ya-station-south-gate-B", label: "南改札B", kind: "gate", x: 849, y: 788, sourceIds, reference: "B1F南改札Bの境界。" },
  ],
  evidence: {
    sourceIds, file: "research/yokohama-current-2026-10-07/station-exits/b7f15d7345db22f420994947afb2f79770d5aab9f077ef4adbbd2bc16551bcf0.jpg",
    sha256: "b7f15d7345db22f420994947afb2f79770d5aab9f077ef4adbbd2bc16551bcf0", width: 2500, height: 1146,
    method: "現行公式ページのB1F平面図から機能区域・出口端・設備記号中心を個別転記。ロッカーA/B/Cは公式設置図と照合。原画像は画面へ掲載せず、椅子位置や歩行経路を推定しない。",
    status: "source-checked-symbols-not-route",
  },
};

type StationItem = { id: string; name: string; purpose: GuideFacility["purpose"]; kind: string; point: [number, number]; location: string; paid: boolean; detail: string; toiletType?: GuideFacility["toiletType"]; group?: string };
const lockers = "料金・サイズ・決済方法は利用するロッカーの表示をご確認ください。終電後の取り出し可否は未確認です。";
const items: StationItem[] = [
  { id: "ya-tokyu", name: "新横浜駅・南改札内ロッカー A", purpose: "荷物", kind: "locker", point: [642, 531], location: "南改札内・階段付近", paid: true, detail: `相鉄・東急新横浜線の改札内です。取り出すときも改札への入場が必要です。${lockers}` },
  { id: "ya-tokyu-B", name: "新横浜駅・出口5B付近ロッカー B", purpose: "荷物", kind: "locker", point: [772, 866], location: "改札外・出口5B付近", paid: false, detail: lockers },
  { id: "ya-tokyu-C", name: "新横浜駅・出口7付近ロッカー C", purpose: "荷物", kind: "locker", point: [1697, 533], location: "改札外・出口7付近", paid: false, detail: lockers },
  { id: "ya-station-south-wc", name: "新横浜駅・南改札内 男女トイレ", purpose: "トイレ", kind: "restroom", point: [429, 607], location: "南改札内", paid: true, detail: "相鉄・東急新横浜線の改札内の男女トイレです。", toiletType: "mixed", group: "ya-station-south-toilets" },
  { id: "ya-station-south-accessible", name: "新横浜駅・南改札内 多機能トイレ", purpose: "トイレ", kind: "accessible", point: [478, 611], location: "南改札内・男女トイレ横", paid: true, detail: "車いす・オストメイト対応の記号があります。室数・当日の稼働は現地でご確認ください。", toiletType: "accessible", group: "ya-station-south-toilets" },
  { id: "ya-station-north-wc", name: "新横浜駅・北改札内 男女トイレ", purpose: "トイレ", kind: "restroom", point: [1781, 660], location: "北改札内", paid: true, detail: "相鉄・東急新横浜線の改札内の男女トイレです。", toiletType: "mixed", group: "ya-station-north-toilets" },
  { id: "ya-station-north-accessible", name: "新横浜駅・北改札内 多機能トイレ", purpose: "トイレ", kind: "accessible", point: [1827, 667], location: "北改札内・男女トイレ横", paid: true, detail: "車いす・オストメイト対応の記号があります。室数・当日の稼働は現地でご確認ください。", toiletType: "accessible", group: "ya-station-north-toilets" },
  { id: "ya-station-south-diaper", name: "新横浜駅・南改札内 おむつ替え", purpose: "赤ちゃん", kind: "diaper", point: [517, 612], location: "南改札内・多機能トイレ区域", paid: true, detail: "ベビーシートの記号があります。おむつ替えに利用する設備です。" },
  { id: "ya-station-north-diaper", name: "新横浜駅・北改札内 おむつ替え", purpose: "赤ちゃん", kind: "diaper", point: [1865, 668], location: "北改札内・多機能トイレ区域", paid: true, detail: "ベビーシートの記号があります。おむつ替えに利用する設備です。" },
  { id: "ya-station-south-aed", name: "新横浜駅・南改札内 AED", purpose: "AED", kind: "aed", point: [795, 738], location: "南改札内・窓口付近", paid: true, detail: "駅平面図にAEDの記号があります。緊急時は駅係員へお知らせください。" },
  { id: "ya-station-north-aed", name: "新横浜駅・北改札内 AED", purpose: "AED", kind: "aed", point: [1548, 700], location: "北改札内・窓口付近", paid: true, detail: "駅平面図にAEDの記号があります。緊急時は駅係員へお知らせください。" },
  { id: "ya-station-ev-f", name: "新横浜駅・出口7側 エレベーター", purpose: "案内", kind: "elevator", point: [1752, 371], location: "改札外・出口7側（f）", paid: false, detail: "駅B1Fと地上を結ぶエレベーターです。駅から会場までの連続した段差なし経路は別途確認が必要です。" },
  { id: "ya-station-ev-g", name: "新横浜駅・出口9側 エレベーター", purpose: "案内", kind: "elevator", point: [898, 354], location: "改札外・出口9側（g）", paid: false, detail: "駅B1Fと地上を結ぶエレベーターです。日産スタジアム方面の出口9側にあります。" },
  { id: "ya-station-ev-c", name: "新横浜駅・歩行者デッキ エレベーター", purpose: "案内", kind: "elevator", point: [827, 861], location: "改札外・出口5B側（c）", paid: false, detail: "JR新横浜駅方面の歩行者デッキへ上がるエレベーターです。地上行きのf・gと行き先を区別してください。" },
];
export const yokohamaStationFacilities: GuideFacility[] = items.map(item => ({
  id: item.id, name: item.name, purpose: item.purpose, kind: item.kind, floor: "駅B1F", scope: "場外", location: item.location, detail: item.detail,
  sourceIds: item.purpose === "荷物" ? ["ya-tokyu-locker", ...sourceIds] : sourceIds, precision: "diagram-point",
  ...(item.toiletType ? { toiletType: item.toiletType } : {}), ...(item.purpose === "荷物" ? { storageKind: "coin" as const } : {}),
  anchor: { diagramId, x: item.point[0], y: item.point[1], sourceIds, reference: "公式駅B1F平面図の設備記号中心。個室や機械の実測位置・台数ではない。" },
}));
export const yokohamaStationMeta: Record<string, FacilityMeta> = Object.fromEntries(items.map(item => [item.id, {
  name: item.name, location: item.location, detail: item.detail, area: "相鉄・東急 新横浜駅", outsideViewIds: ["access", "station-B1"],
  accessCondition: item.paid ? "相鉄・東急新横浜線 改札内" : "駅の改札外・会場入場前", url: item.purpose === "荷物" ? "https://www.tokyu.co.jp/area/shin-yokohama/station/coin-locker/" : "https://www.tokyu.co.jp/area/shin-yokohama/station/",
}]));
export const yokohamaStationGroups: FacilityGroup[] = [...new Set(items.map(item => item.group ?? `area-${item.id}`))].map(id => {
  const members = items.filter(item => (item.group ?? `area-${item.id}`) === id);
  return { id, diagramId, purpose: members[0].purpose, label: members.length > 1 ? `${members[0].location}のトイレ` : members[0].name,
    area: members[0].location, memberIds: members.map(item => item.id), x: members.reduce((n, item) => n + item.point[0], 0) / members.length, y: members.reduce((n, item) => n + item.point[1], 0) / members.length,
    boundary: "駅B1Fの同じ室区域・目的・改札境界。会場図や別改札へ位置を転用しない。", visualReview: "source-checked" };
});
export const yokohamaStationNearby = {
  "ya-station-exit-7": ["ya-tokyu-C", "ya-station-ev-f", "ya-station-north-wc", "ya-station-north-accessible", "ya-station-north-diaper", "ya-station-north-aed"],
  "ya-station-exit-8": ["ya-tokyu-C", "ya-station-ev-f", "ya-station-north-wc", "ya-station-north-accessible", "ya-station-north-diaper", "ya-station-north-aed"],
  "ya-station-exit-5B": ["ya-tokyu-B", "ya-station-ev-c", "ya-station-south-wc", "ya-station-south-accessible", "ya-station-south-diaper", "ya-station-south-aed"],
  "ya-station-exit-9": ["ya-station-ev-g", "ya-tokyu", "ya-station-south-wc", "ya-station-south-accessible", "ya-station-south-diaper", "ya-station-south-aed"],
  "ya-station-north-gate": ["ya-tokyu-C", "ya-station-ev-f", "ya-station-north-wc", "ya-station-north-accessible", "ya-station-north-diaper", "ya-station-north-aed"],
  "ya-station-south-gate-A": ["ya-tokyu", "ya-tokyu-B", "ya-station-ev-c", "ya-station-ev-g", "ya-station-south-wc", "ya-station-south-accessible", "ya-station-south-diaper", "ya-station-south-aed"],
  "ya-station-south-gate-B": ["ya-tokyu", "ya-tokyu-B", "ya-station-ev-c", "ya-station-south-wc", "ya-station-south-accessible", "ya-station-south-diaper", "ya-station-south-aed"],
};
