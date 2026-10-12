import type { DedicatedVenueGuide } from "../types";
import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import standData from "./stand-seats.json";
export const osakaStandSeats = standData as StandMapData;
export const osakaLevels = [{ id: "スタンド", label: "スタンド A〜N", color: "#e7abc7", point: [660, 125] }, { id: "BOX", label: "BOX席", color: "#c7b9e0", point: [660, 610] }];
export const osakaAreas = [{ id: "all", label: "全体" }, { id: "AN", label: "A・N" }, { id: "BCD", label: "B〜D" }, { id: "EFG", label: "E〜G" }, { id: "HIJK", label: "H〜K" }, { id: "LM", label: "L・M" }];
export function makeOsakaFacilityConfig(guide: DedicatedVenueGuide): FacilityConfig {
  const groups: FacilityGroup[] = [];
  const rooms: [string, string, string[]][] = [
    ["osaka-food-08", "柱06〜09付近", ["shop-1-08", "vending-1-bottom"]],
    ["osaka-food-14", "柱13〜14付近", ["shop-1-14", "vending-1-right"]],
    ["osaka-wc-14", "柱13〜14付近", ["toilet-w-1-right", "toilet-m-1-temporary"]],
  ];
  for (const [id, label, ids] of rooms) {
    const members = ids.map(id => guide.facilities.find(f => f.id === id)!);
    groups.push({ id, label, area: id, memberIds: ids, purpose: members[0].purpose, diagramId: members[0].anchor!.diagramId,
      x: members.reduce((n, f) => n + f.anchor!.x, 0) / members.length, y: members.reduce((n, f) => n + f.anchor!.y, 0) / members.length,
      boundary: "公式1F図の同じ側のコンコース区域。別階・道路・入場境界をまたがない。個々の売店・トイレ室は一覧で区別。", visualReview: "source-checked" });
  }
  const assigned = new Set(groups.flatMap(g => g.memberIds));
  for (const f of guide.facilities) if (f.anchor && !assigned.has(f.id)) groups.push({ id: `area-${f.id}`, label: f.location, area: f.id, purpose: f.purpose, memberIds: [f.id], diagramId: f.anchor.diagramId, x: f.anchor.x, y: f.anchor.y, boundary: "公式図の単一設備区域。未登録の施設を距離で結合しない。", visualReview: "source-checked" });
  const meta: Record<string, FacilityMeta> = {};
  const locations: Record<string, string> = { "toilet-w-1-top": "柱30付近", "toilet-w-1-left": "柱37付近", "toilet-w-1-lower-left": "柱40付近", "toilet-w-1-bottom-right": "柱08付近", "toilet-w-1-right": "柱14付近", "toilet-w-1-upper-right": "柱18付近", "toilet-m-1-top": "柱27付近", "toilet-m-1-bottom": "柱04付近", "toilet-m-1-temporary": "柱13付近・臨時", "changing-1-top-left": "柱30付近", "changing-1-top-right": "柱27付近", "changing-1-left": "柱37付近", "changing-1-lower-left": "柱40付近", "changing-1-bottom-left": "柱04付近", "changing-1-bottom-right": "柱08付近", "changing-1-right": "柱14付近", "vending-1-bottom": "柱06〜08付近", "vending-1-right": "柱13付近" };
  for (const f of guide.facilities) meta[f.id] = { name: f.id === "changing-1" ? "おむつ替えの案内" : f.name, location: locations[f.id] ?? f.location.replace(/^公式[12]F図[・\s]*/, ""), area: f.id === "osaka-locker-jr" ? "大阪城公園駅" : f.id === "osaka-locker-obp" ? "OBP駅" : groups.find(g => g.memberIds.includes(f.id))?.id ?? f.id,
    accessCondition: f.scope === "場内" ? "公演チケット・開場後" : f.id === "osaka-locker-obp" ? "駅の改札外・入場前に利用可" : "駅構内・改札内外は案内を確認",
    detail: f.scope === "場外" || f.id.startsWith("shop-1-west-") || f.id === "shop-2-14" ? f.detail : f.purpose === "荷物" ? "小300円・中500円・大700円。100円硬貨のみ。会場に両替機はありません。" : f.purpose === "トイレ" ? f.toiletType === "accessible" ? "オストメイト対応の多目的トイレです。当日の開放案内をご確認ください。" : f.id.includes("temporary") ? "公演により使える臨時トイレです。利用できるかは当日の表示を確認してください。" : "公演によって男女の割り当て・開放が変わる場合があります。" : f.purpose === "赤ちゃん" ? "おむつ替え設備です。授乳や利用の案内が必要な場合は近くのスタッフにお尋ねください。" : "売店・自動販売機の営業と品揃えは当日の案内をご確認ください。",
    url: f.id === "osaka-locker-jr" ? "https://eki.jr-odekake.net/top?id=0610515" : f.id === "osaka-locker-obp" ? "https://subway.osakametro.co.jp/station_guide/n/n21/" : f.purpose === "荷物" ? "https://www.osaka-johall.com/floorguide/coinlocker/" : undefined };
  const aliases: Record<string, string[]> = { "outside-north": ["北口", "北玄関"], "outside-south": ["南口", "南玄関"], "outside-east": ["東玄関", "東口"], "outside-jr": ["大阪城公園", "JR大阪城公園駅"], "outside-obp": ["大阪ビジネスパーク", "大阪ビジネスパーク駅", "OBP", "OBP駅"] };
  for (const d of guide.diagrams!) for (const m of d.landmarks) if (m.kind === "pillar") aliases[m.id] = [`${+m.label}`, `柱${m.label}`, `柱${+m.label}`];
  return { defaultFloor: "2F", floors: ["1F", "2F"], groups, meta, aliases,
    primaryLandmarks: { "osaka-f1": ["f1-pillar-03", "f1-pillar-17", "f1-pillar-28", "f1-pillar-38"], "osaka-f2": ["f2-pillar-03", "f2-pillar-17", "f2-pillar-28", "f2-pillar-38"], "osaka-outside": ["outside-north", "outside-south", "outside-east", "outside-jr", "outside-obp"] },
    outsideDiagramId: "osaka-outside", venueLabel: { name: "大阪城ホール", point: [355, 412] }, landmarkPlaceholder: { inside: "例：08 / 柱08", outside: "例：北玄関 / OBP駅" },
    coverage: { description: "公式パンフレットの会場・大阪城公園駅・OBP駅。道路・橋をまたぐグループは作らない。", sourceIds: ["outside-pamphlet", "access"] } };
}
export const osakaCapabilities = {
  rulesVersion: 2, configuration: "permanent-stand-2026-10-05",
  numericSearch: { status: "verified", evidence: "公式座席検索の8,933個の席キー。列別実在区間・欠番・ブロック別の重複番号を保持。" },
  rowGeometry: { status: "approximate", evidence: "公式各ブロック図と全体図を位置合わせした列の向きの目安。個々の椅子ピンや眺めは保証しない。" },
  arena: { status: "unavailable", evidence: "公演別配置。常設図に固定しない。" },
  outside: { status: "approximate", evidence: "公式場外図の代表駅と玄関。未確認の経路線・個別ロッカーピンを補わない。" },
};
