import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { GuideFacility } from "../types";
import type { StandMapData } from "@/components/venue/template/standMap";
import evidence from "./floor-evidence.json";
import standData from "./stand-seats.json";
import { yokohamaOutsideFacilities } from "./outside";
import { yokohamaStationFacilities, yokohamaStationGroups, yokohamaStationMeta, yokohamaStationNearby } from "./station";
import { yokohamaExteriorGroups, yokohamaExteriorNearby } from "./exterior";
import { yokohamaTransferMeta } from "./transfer-storage";
import { yokohamaOperatorMeta } from "./operator-facilities";
import { yokohamaInsideFacilities, yokohamaInsideMeta } from "./inside-services";
export const yokohamaStandSeats = standData as StandMapData;
export const yokohamaLevels = [
  { id: "アリーナ席", label: "アリーナ席 A〜F", color: "#e7abc7", point: [610, 300] },
  { id: "スタンド席", label: "スタンド席", color: "#c7b9e0", point: [615, 35] },
];
export const yokohamaAreas = [{ id: "all", label: "全体" }, { id: "AD", label: "A・D" }, { id: "BC", label: "B・C" }, { id: "EF", label: "E・F" }, { id: "NW", label: "北・西" }, { id: "ES", label: "東・南" }];
const facilities = [...evidence.facilities as GuideFacility[], ...yokohamaInsideFacilities];
const groups: FacilityGroup[] = [];
const rooms: [string, string, string[]][] = [
  ["ya-wc-1-left", "図の左側", ["ya-1f-restrooms-left", "ya-1f-accessible-left"]],
  ["ya-wc-1-right", "図の右側", ["ya-1f-restrooms-right", "ya-1f-accessible-right", "ya-1f-ostomate-right"]],
  ["ya-wc-2-nw", "図の左上", ["ya-2f-restrooms-nw", "ya-2f-accessible-nw"]],
  ["ya-wc-2-se", "図の右下", ["ya-2f-restrooms-se", "ya-2f-accessible-se", "ya-2f-ostomate-se"]],
  ["ya-food-1-right", "入口右側の売店・自販機", ["ya-1f-shop", "ya-1f-vending-right"]],
  ["ya-food-2-nw", "図の左上の売店・自販機", ["ya-2f-shop-nw", "ya-2f-vending-nw"]],
  ["ya-food-2-ne", "図の右上の売店・自販機", ["ya-2f-shop-ne", "ya-2f-vending-ne"]],
  ["ya-food-2-sw", "図の左下の売店・自販機", ["ya-2f-shop-sw", "ya-2f-vending-sw"]],
  ["ya-food-2-se", "図の右下の売店・自販機", ["ya-2f-shop-se", "ya-2f-vending-se"]],
];
for (const [id, label, ids] of rooms) {
  const members = ids.map(id => facilities.find(f => f.id === id)!);
  groups.push({ id, label, area: id, memberIds: ids, purpose: members[0].purpose, diagramId: members[0].anchor!.diagramId,
    x: members.reduce((sum, f) => sum + f.anchor!.x, 0) / members.length, y: members.reduce((sum, f) => sum + f.anchor!.y, 0) / members.length,
    boundary: "公式フロア図の同じ階・同じ側のロビー区域。別階・別ロビー・入場境界をまたがない。", visualReview: "source-checked" });
}
const assigned = new Set(groups.flatMap(g => g.memberIds));
for (const f of facilities) if (!assigned.has(f.id) && f.scope === "場内" && f.anchor) groups.push({ id: `area-${f.id}`, label: f.name, area: f.id, memberIds: [f.id], purpose: f.purpose, diagramId: f.anchor.diagramId, x: f.anchor.x, y: f.anchor.y, boundary: "公式図の単一設備区域", visualReview: "source-checked" });
const meta: Record<string, FacilityMeta> = {};
for (const f of facilities) {
  const group = groups.find(g => g.memberIds.includes(f.id));
  const location = f.name.match(/（(.*?)）/)?.[1] ?? "正面入口側";
  meta[f.id] = { name: f.name.replace(/（.*?）/g, ""), location, area: group?.id ?? f.id, accessCondition: f.scope === "場内" ? "公演チケット・開場後" : "入場前・公演の営業案内を確認",
    detail: f.purpose === "トイレ" ? f.kind === "ostomate" ? "オストメイト対応の設備があります。" : f.toiletType === "accessible" ? "車いす対応の多目的トイレです。" : "男女のトイレがあります。当日の表示をご確認ください。" :
      f.purpose === "荷物" ? "館内のコインロッカーです。大きな荷物は駅の大型ロッカーや店舗預かりも確認してください。" :
      f.kind === "diaper" ? "おむつ替えシートです。授乳室とは別の設備です。" :
      f.kind === "charging" ? "モバイルバッテリーのレンタルサービスです。料金と利用方法は端末の案内をご確認ください。" :
      f.purpose === "飲食" ? "品揃え・営業は当日の店舗案内をご確認ください。" : "当日の窓口の営業と案内をご確認ください。",
    url: f.purpose === "荷物" ? "https://www.yokohama-arena.co.jp/other/faq/" : undefined,
    ...yokohamaInsideMeta(f) };
}
for (const f of yokohamaOutsideFacilities) meta[f.id] = { location: f.location, detail: f.detail, area: f.id.startsWith("ya-mugic") ? "横浜アリーナ" : "新横浜駅", outsideViewIds: ["access"], accessCondition: f.id === "ya-cubic-jr" ? "JR横浜線改札内" : f.purpose === "荷物" ? "入場前に利用可" : "キュービックプラザの利用する階の開館時間を確認", url: f.id.startsWith("ya-mugic") ? "https://mugic.jp/piano/" : f.id === "ya-cubic-jr" || f.purpose !== "荷物" ? "https://www.cubicplaza.com/facilities/" : "https://www.cubicplaza.com/facilities/coin-locker" };
for (const f of facilities.filter(f => f.scope === "場外")) meta[f.id].outsideViewIds = ["access"];
Object.assign(meta, yokohamaStationMeta);
Object.assign(meta, yokohamaTransferMeta);
for (const [id, operatorMeta] of Object.entries(yokohamaOperatorMeta)) meta[id] = { ...meta[id], ...operatorMeta };
for (const f of yokohamaOutsideFacilities.filter(f => f.id.startsWith("ya-mugic"))) meta[f.id].accessCondition = f.purpose === "飲食" ? "外側入口・1人1品以上の注文" : "外側入口・店舗の受付時間を確認";
meta["ya-lawson-arena"].area = "横浜アリーナ";
meta["ya-lawson-arena"].accessCondition = "外側入口・会場入場前";
meta["ya-lawson-arena"].url = "https://www.yokohama-arena.co.jp/floormap/";
groups.push(...yokohamaStationGroups);
groups.push(...yokohamaExteriorGroups);
for (const id of yokohamaExteriorNearby["ya-exterior-entrance"]) meta[id].outsideViewIds = ["access", "venue-exterior"];
const stationIds = yokohamaStationFacilities.map(f => f.id);
export const yokohamaFacilityConfig: FacilityConfig = {
  defaultFloor: "2F", floors: ["1F", "2F", "3F", "階未確認"], groups, meta,
  primaryLandmarks: { "ya-floor-1-native": ["ya-1f-entrance-label"], "ya-floor-2-map-native": ["ya-2f-entrance-label"], "ya-floor-3-map-native": [], "ya-access-current": ["ya-main-area", "ya-jr-station", "ya-subway-area"], "ya-venue-exterior": ["ya-exterior-entrance", "ya-exterior-lawson-entry", "ya-exterior-mugic-entry"], "ya-station-B1": ["ya-station-exit-7", "ya-station-exit-8", "ya-station-exit-5B", "ya-station-north-gate", "ya-station-south-gate-A", "ya-station-south-gate-B", "ya-station-exit-9"] },
  aliases: { "ya-exterior-entrance": ["入口", "正面", "正面入口", "横浜アリーナ"], "ya-exterior-lawson-entry": ["ローソン", "LAWSON", "ローソン入口"], "ya-exterior-mugic-entry": ["MUGIC", "MUGIC入口", "ムジーク"], "ya-1f-entrance-label": ["正面入口", "正面", "入口"], "ya-2f-entrance-label": ["正面入口", "正面", "入口"], "ya-main-area": ["正面入口", "正面", "入口", "横浜アリーナ"], "ya-jr-station": ["新横浜", "JR新横浜", "新横浜駅北口", "新横浜駅東口"], "ya-subway-area": ["出口7・8", "7・8", "地下鉄", "東急", "相鉄"], "ya-station-exit-7": ["7", "7番出口", "出口7・8", "7・8"], "ya-station-exit-8": ["8", "8番出口", "出口7・8", "7・8"], "ya-station-exit-5B": ["5B", "5B出口", "5B番出口"], "ya-station-exit-9": ["9", "9番出口"], "ya-station-north-gate": ["北", "北改札口"], "ya-station-south-gate-A": ["南", "南改札", "南改札口", "南改札A"], "ya-station-south-gate-B": ["南", "南改札", "南改札口", "南改札B"] },
  outsideDiagramId: "ya-access-current", venueLabel: { name: "横浜アリーナ", point: [720, 285] },
  outsideViews: [
    { id: "access", label: "会場・駅周辺", diagramId: "ya-access-current", floorLabel: "会場・主要駅", northUp: true, venueLabel: { name: "横浜アリーナ", point: [720, 285] } },
    { id: "venue-exterior", label: "会場の外側入口", diagramId: "ya-venue-exterior", floorLabel: "横浜アリーナ・外側入口", venueLabel: { name: "横浜アリーナ", point: [332, 185] } },
    { id: "station-B1", label: "新横浜駅 B1F", diagramId: "ya-station-B1", floorLabel: "相鉄・東急 新横浜駅 B1F" },
  ],
  landmarkFacilityIds: {
    "ya-subway-area": stationIds,
    "ya-jr-station": yokohamaOutsideFacilities.filter(f => f.id.startsWith("ya-cubic-") || ["ya-multi-platform", "ya-multi-shinohara"].includes(f.id)).map(f => f.id),
    "ya-main-area": [...facilities.filter(f => f.scope === "場外").map(f => f.id), ...yokohamaOutsideFacilities.filter(f => f.id.startsWith("ya-mugic") || f.id === "ya-lawson-arena").map(f => f.id)],
    ...yokohamaStationNearby,
    ...yokohamaExteriorNearby,
  },
  landmarkGroupIds: Object.fromEntries(Object.entries({ ...yokohamaStationNearby, ...yokohamaExteriorNearby }).map(([id, nearby]) => [id, groups.filter(g => g.memberIds.some(member => nearby.includes(member))).map(g => g.id)])),
  landmarkPlaceholder: { inside: "例：正面入口", outside: "例：新横浜駅 / 出口7" },
  landmarkLabels: { "ya-1f-entrance-label": "正面入口側", "ya-2f-entrance-label": "正面入口側" },
  landmarkLabelPoints: { "ya-station-south-gate-A": [1100, 620], "ya-station-south-gate-B": [1100, 880] },
  coverage: { description: "会場・駅周辺、公式施設外図の店舗入口、独立B1F駅図を切替。店舗入口と会場入場口、改札内外を分けて選択。新横浜と乗換駅の荷物・周辺店舗は場所一覧から検索。予約対応3区域は運営サイトへ。連続歩行経路・当日指定入場口は別確認。", sourceIds: ["access", "floor-outside-map", "ya-exterior-services", "ya-tokyu-station", "ya-tokyu-locker", "ya-kikuna-locker", "ya-yokohama-locker", "ya-jr-locker-locations", "ya-multi-current", "ya-familymart-operator", "ya-accea-cafe-operator"] },
};
export const yokohamaCapabilities = {
  rulesVersion: 2, configuration: "common-bowl-A-F-all-stand-runs-2026-10-07",
  blocks: { status: "partial", evidence: "A/D24区間・B/C/E/F56区間・北36区間・東38区間・西/南各30区間、計214区間を通路と番号の空白で分離。公演別の使用席は固定しない。" },
  numberReference: { status: "partial", evidence: "A〜F・東西南北の確認済み番号区間は公式図の若い番号を辺中点へ表示。全列共通の端番号ではない。未確認列を補わない。" },
  numericSearch: { status: "partial", evidence: "A〜F7362・北1285・東1365・西/南各1050、計12112席キーを接続。A/D12列・B/C/E/F11列は準備中。欠番・階段の空白を範囲補間しない。" },
  rowLines: { status: "partial", evidence: "A/Dの1〜11・13〜22列、B/C/E/Fの1〜10・12〜22列、東西南北の1〜10列を区間ごとに表示。階段前の6/7列に席を補わず、西/南の端の細い区間は7〜10列のみ。曲がる列線は折れ点を保持。列線は原図端点からの向きの目安で椅子ピンではない。" },
  outside: { status: "partial", evidence: "会場・駅周辺、独立原向き施設外図、個別出口・改札・14設備記号のB1F駅図。外側店舗入口と館内入場口を分離。新横浜17荷物と乗換駅4区域、併設飲食2/周辺飲食2を接続。予約対応3区域は改札内外・料金/予約料/時間を運営サイトで照合。未確認の機器点や連続経路を補わない。" },
};
