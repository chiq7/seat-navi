import type { FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { GuideDiagram, GuideFacility, GuideSource } from "../types";

const barrierfree = "https://www.yokohama-arena.co.jp/barrierfree/";
const faq = "https://www.yokohama-arena.co.jp/other/faq/";
const roomEquipment = "https://www.yokohama-arena.co.jp/common/img/organizer/use/price_20260401.pdf";
export const yokohamaInsideSources: GuideSource[] = [
  { id: "ya-inside-locker-1-current", title: "横浜アリーナ・1Fロッカーと売店", url: "https://www.yokohama-arena.co.jp/floormap/1f.html", checkedAt: "2026-10-07", scope: "小300円/大A・B600円と幅・奥行・高さ。180/60/8口は1F全体の集計で、左右区域へ各々割り当てない。決済・再開閉・開場前利用は未確認。", usage: "facts-only" },
  { id: "ya-inside-locker-2-current", title: "横浜アリーナ・2Fロッカーと売店", url: "https://www.yokohama-arena.co.jp/floormap/2f.html", checkedAt: "2026-10-07", scope: "小300円/大A600円と寸法。290/54口は2F全体の集計。大Bを2Fへ転用しない。4売店を原図の北/東/西/南スタンド側と照合し、メニュー例を検索へ接続。", usage: "facts-only" },
  { id: "ya-barrierfree-current", title: "横浜アリーナ・バリアフリー案内", url: barrierfree, checkedAt: "2026-10-07", scope: "1/2F多目的トイレ計4区域、係員案内の館内EV、車いす貸出なし。EVの階/位置・台数は未掲載。関係者の搬入EVと一般利用を区別。", usage: "facts-only" },
  { id: "ya-faq-current", title: "横浜アリーナ・来場FAQ", url: faq, checkedAt: "2026-10-07", scope: "託児施設・会場によるスーツケース/ベビーカー預かりなし、館内1/2Fロッカーと飲食条件。授乳室不存在は断定しない。旧観光案内所紹介は現行閉鎖案内と異なり掲載しない。", usage: "facts-only" },
  { id: "ya-current-room-equipment", title: "横浜アリーナ・2026年4月の救護室備品", url: roomEquipment, checkedAt: "2026-10-07", scope: "現行料金表の印刷2ページ（PDF3ページ）脚注3に救護室備品としてAED。一般客が自由に入室/操作できる設置点ではない。看護師等の手配は主催者、階/室入口/開放は未確定。", usage: "facts-only" },
];

export const yokohamaInsideFacilities: GuideFacility[] = [
  { id: "ya-elevator-unplaced", name: "館内エレベーター（係員へ）", purpose: "案内", floor: "階未確認", scope: "場内", kind: "elevator", precision: "text-only", location: "館内・主催者係員に場所を確認", detail: "車いす用の乗車ボタン・操作盤・鏡があります。利用時は主催者係員が案内します。場所と利用する階は係員にお尋ねください。", sourceIds: ["ya-barrierfree-current"] },
  { id: "ya-aed-firstaid-unplaced", name: "救護室のAED（係員へ）", purpose: "AED", floor: "階未確認", scope: "場内", kind: "aed", precision: "text-only", location: "救護室・近くの係員に確認", detail: "救護室の備品としてAEDがあります。体調不良や緊急時は近くの係員にお知らせください。救護室への案内と当日の対応は主催者に確認してください。", sourceIds: ["ya-current-room-equipment"] },
];

export const yokohamaInsideUnknownDiagram: GuideDiagram = {
  id: "ya-inside-unknown-floor", floor: "階未確認", scope: "場内", viewBox: [0, 0, 650, 430],
  concoursePaths: [], contextPaths: [], landmarks: [],
  evidence: { sourceIds: ["ya-barrierfree-current", "ya-current-room-equipment"], file: "research/yokohama-current-2026-10-07/inside-services-and-access/ya-barrierfree-current.html", sha256: "1d3a7098e7387b9c04c2fdabfd489abb9a45531bfc6a8f7c59639923f26c8324", width: 0, height: 0, method: "list-only: source text confirms equipment, not floors or map positions; empty viewBox is a UI canvas, not source dimensions", status: "text-only-no-map" },
};

const small = "小300円・幅357×奥行453×高さ318mm";
const largeA = "大A600円・幅237×奥行513×高さ802mm";
const largeB = "大B600円・幅346×奥行482×高さ774mm";
export function yokohamaInsideReferenceIds(f: GuideFacility): string[] {
  if (f.scope !== "場内") return [];
  if (f.kind === "locker" || f.kind === "shop") return [`ya-inside-locker-${f.floor[0]}-current`, "ya-faq-current"];
  if (f.toiletType === "accessible") return ["ya-barrierfree-current"];
  return [];
}
export function yokohamaInsideMeta(f: GuideFacility): Partial<FacilityMeta> {
  if (f.scope !== "場内") return {};
  if (f.kind === "locker") return {
    detail: `${f.floor}のロッカー案内は、${small}、${largeA}${f.floor === "1F" ? `、${largeB}` : ""}（税込）です。サイズの設置先と空きは現地の機器でご確認ください。利用時間・支払い方法は機器と公演の案内に従ってください。`,
    url: `https://www.yokohama-arena.co.jp/floormap/${f.floor.toLowerCase()}.html`,
    accessCondition: "館内ロビー・開場前の利用は公演案内を確認",
  };
  if (f.kind === "shop") {
    const side = f.floor === "1F" ? "1F" : f.id.endsWith("nw") ? "北" : f.id.endsWith("ne") ? "東" : f.id.endsWith("sw") ? "西" : "南";
    return { name: `アリーナショップ・${side}${side === "1F" ? "" : "側"}`, location: f.floor === "1F" ? "正面入口から図の右側" : `${side}スタンド側のロビー`,
      detail: `飲み物・菓子・サンドイッチ・おにぎりなどを販売しています。${["1F", "南"].includes(side) ? "メニュー例はホットドッグ・ディップポテト・やきそば。" : "メニュー例はもちコロ・焼き小籠包・アメリカンポテト・カツサンド。"}営業と当日のメニューは店頭をご確認ください。客席で食事はできません。ロビーでお召し上がりください。`,
      url: `https://www.yokohama-arena.co.jp/floormap/${f.floor.toLowerCase()}.html` };
  }
  if (f.kind === "elevator" || f.kind === "aed") return { location: f.location, detail: f.detail, area: "館内・係員案内", accessCondition: "主催者係員に確認", url: f.kind === "elevator" ? barrierfree : undefined };
  if (f.toiletType === "accessible") return { detail: "車いすに対応したスペースと自動扉があります。当日の利用は現地の表示をご確認ください。", url: barrierfree };
  return {};
}
