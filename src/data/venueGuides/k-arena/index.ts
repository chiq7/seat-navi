import evidence from "./floor-evidence.json";
import stands from "./stand-seats.json";
import { kArenaOutsideDiagram, kArenaOutsideFacilities, kArenaOutsideSources } from "./outside";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility } from "../types";
const connectedFloors = evidence.diagrams.map(diagram => diagram.floor).join("・");
const connectedMarks = evidence.diagrams.reduce((total, diagram) => total + diagram.landmarks.length, 0);

export const kArenaGuide: DedicatedVenueGuide = {
  venueId: "k-arena", name: "Kアリーナ横浜",
  seatNote: "常設スタンドのLEVEL3・5・7を探せます。公演別アリーナの配置は主催者の案内をご確認ください。",
  diagramNote: `設備案内は${connectedFloors}の確認済み記号だけの部分実装です。各公式フロア図の記号位置と可視背景を同じ原寸で整理しています。室入口・歩行経路の図ではありません。`,
  seatTypes: ["LEVEL3", "LEVEL5", "LEVEL7"],
  seats: stands.blocks.map(b => ({ id: b.id, label: `${b.level} ${b.balcony ? "バルコニー " : ""}${b.label}`, type: b.level, floor: b.level, x: b.center[0], y: b.center[1], sourceIds: b.sourceIds,
    rows: b.rows.map(r => ({ label: r.label, ranges: r.segments.map(s => ({ start: s.start, end: s.end, passage: "" })) })) })),
  seatMap: { viewBox: stands.viewBox, initialView: stands.viewBox, rowGeometryStatus: "verified", shapeStatus: "公式PDFの列線と端番号。細かな輪郭を整理した常設スタンド62範囲。",
    groups: Object.fromEntries(stands.blocks.map(b => [b.id, { x: b.center[0], y: b.center[1], path: b.path, precision: "diagram-point" as const, sourceIds: b.sourceIds, reference: stands.method,
      rowPaths: Object.fromEntries(b.rows.map(r => [r.label, r.segments.map(s => `M${s.a.join(",")}L${s.b.join(",")}`)])) }])) },
  sources: [
    { id: "k-arena-floor", title: "公式フロアガイド", url: "https://k-arena.com/floor/", checkedAt: "2026-09-30", scope: `LEVEL1/3/4/5/7の一般公開図。現在の接続は${connectedFloors}の確認済み記号`, usage: "permission-unconfirmed" },
    { id: "k-arena-floor-level3-desktop", title: "公式LEVEL3フロア図", url: "https://k-arena.com/wp-content/themes/k-arena/assets/images/floor/img_floor_map_lv3.jpg", checkedAt: "2026-09-30", scope: "原寸1200×960、設備11記号と目印16。中央階段は領域の代表位置。個別の室入口・当日の運用は未確認", usage: "permission-unconfirmed" },
    { id: "k-arena-faq", title: "公式よくあるご質問", url: "https://k-arena.com/faq/", checkedAt: "2026-10-04", scope: "LEVEL3メイン入口、場内外のロッカー料金/時間/決済、場外トイレ、車いすのサウスゲート案内。公演主催者の運用を優先", usage: "facts-only" },
    { id: "k-arena-shop", title: "公式ショップガイド", url: "https://k-arena.com/shopguide/", checkedAt: "2026-09-30", scope: "館内常設売店は全11箇所。各階DRINKの図示記号と実店舗の対応・当日の営業は未確認", usage: "facts-only" },
    { id: "k-arena-seat", title: "公式シートマップ", url: "https://k-arena.com/seat/", checkedAt: "2026-10-04", scope: "常設LEVEL3/5/7の公式PDF入口。公演別LEVEL1配置は数値検索へ固定しない", usage: "permission-unconfirmed" },
    { id: "k-arena-seating-pdf", title: "公式全体座席PDF", url: "https://k-arena.com/wp-content/themes/k-arena/assets/pdf/seat-map.pdf", checkedAt: "2026-10-04", scope: "LEVEL3/5/7の常設列線・列番号・列ごとの番号区間を抽出。分割区間を保持。公演別の利用範囲は含まない。", usage: "permission-unconfirmed" },
    { id: "k-arena-access", title: "公式アクセス", url: "https://k-arena.com/access/", checkedAt: "2026-10-04", scope: "駅出口と徒歩目安は本文の2025年3月時点表記。場外略図の駅は代表区域で、出口の精密座標ではない", usage: "facts-only" },
    ...evidence.diagrams.filter(diagram => diagram.floor !== "LEVEL3").map(diagram => ({
      id: `k-arena-floor-level${diagram.floor.replace("LEVEL", "")}-desktop`, title: `公式${diagram.floor}フロア図`,
      url: `https://k-arena.com/wp-content/themes/k-arena/assets/images/floor/img_floor_map_lv${diagram.floor.replace("LEVEL", "")}.jpg`,
      checkedAt: "2026-09-30", scope: "当該階の原寸1200×960。図上記号位置のみ、室入口・現地運用・他階との実機対応は未確認", usage: "permission-unconfirmed" as const,
    })),
    ...kArenaOutsideSources,
  ],
  facilities: [...evidence.facilities as GuideFacility[], ...kArenaOutsideFacilities],
  diagrams: [...evidence.diagrams as GuideDiagram[], kArenaOutsideDiagram],
  routes: [
    { id: "yokohama-east", from: "横浜駅", exit: "東口", stops: [], destination: "Kアリーナ横浜", note: "公式掲載の徒歩目安9分（本文は2025年3月時点）。出口・場外入口の図上位置は未確認です。公演の指定入口と現地案内を確認してください。", sourceIds: ["k-arena-access"] },
    { id: "shin-takashima-4", from: "新高島駅", exit: "4 臨港パーク口", stops: [], destination: "Kアリーナ横浜", note: "公式掲載の徒歩目安5分（本文は2025年3月時点）。駅の代表位置を4番出口へ流用していません。公演の指定入口と現地案内を確認してください。", sourceIds: ["k-arena-access"] },
    { id: "minatomirai-2", from: "みなとみらい駅", exit: "2 いちょう通り口", stops: [], destination: "Kアリーナ横浜", note: "公式掲載の徒歩目安12分（本文は2025年3月時点）。出口からの最短・段差なし経路は未検証です。公演の指定入口と現地案内を確認してください。", sourceIds: ["k-arena-access"] },
  ],
  unverified: [
    `${connectedFloors}の設備${evidence.facilities.length}記号・目印${connectedMarks}だけを接続。未接続の候補、図未掲載設備、現地の室入口・当日の開放範囲は未確認です。`,
    "座席アクセスGATEを場外入場ゲートや座席区画として扱いません。公式常設図にない席・公演で変更される配置は数値検索の対象外です。",
    "車イス席・Lounge5・Bridge・ArenaBar7の領域位置は未接続。バルコニーの座席は公式PDFのLEVEL5へ接続。ラベル位置を室入口へ転用していません。",
    "車イス席の図示領域は座席検索へ未接続。公演別アリーナ配置・トイレ男女割当・エスカレーター運用を図だけで確定しません。",
    "駅出口・場外ゲートの座標、連続経路、AED/救護室の位置は未確認です。資料で見つからないことを不存在とは判断しません。",
    "原画像/ロゴ・輪郭転記・データ集合の公開利用条件、実機QA、元checkoutへの統合は未完です。",
  ],
  rights: { url: "https://k-arena.com/terms-and-conditions/", checkedAt: "2026-09-30", status: "publish-use-unconfirmed", note: "公式利用規約の使用・複製制限を確認。原画像/ロゴは調査用のみ。独自の事実表示、輪郭・データ集合の公開方法は別途判断が必要。現在は非公開のローカル検証です。" },
};
