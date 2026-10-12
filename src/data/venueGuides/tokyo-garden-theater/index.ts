import evidence from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";

export const tokyoGardenTheaterGuide: DedicatedVenueGuide = {
  venueId: "tokyo-garden-theater", name: "東京ガーデンシアター",
  seatNote: "3Fはバルコニー1、4Fはバルコニー2、5Fはバルコニー3。2Fアリーナは公演ごとの配置です。",
  diagramNote: "2〜5Fの設備と場外・入場前の案内。記号代表点は室入口や歩行経路を示しません。",
  seatTypes: ["3F", "4F", "5F"], seats: seats.blocks.map(b => ({ id: b.id, label: b.label, type: b.level, floor: b.level, x: b.center[0], y: b.center[1], rows: b.rows.map(r => ({ label: r.label })), sourceIds: b.sourceIds })), routes: [],
  facilities: evidence.facilities as GuideFacility[],
  diagrams: evidence.diagrams as GuideDiagram[],
  sources: [...evidence.sources, ...[3,4,5].map(f => ({ id: `tgt-seat-${f}-current`, title: `${f}F公式座席図`, url: `https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/wp-content/themes/event-hole/images/common/modal_map_${f}f.webp`, checkedAt: "2026-10-07", scope: "A〜Iの全印字列・各列の両端番号と若い側、横断通路・短い列・車いす置換の空白。列線は原図の番号帯から読んだ目安で、椅子位置ではない。", usage: "facts-only" as const }))] as GuideSource[],
  unverified: [
    "3〜5Fの27正式区画を48物理ブロック・297印字列・4649区画/列/番号キーへ接続。原図の番号帯・横断通路を読み、列ごとの両端と短い列・車いす置換を保持。キー数は収容人数・公演販売席数ではありません。",
    "全体は3階の札、拡大後は正式区画と開始番号、詳細は前後列と若い側の辺中点。輪郭・列線は番号帯を使った独立略図で、個々の椅子や実測位置を示しません。公演別アリーナは固定しません。",
    "2〜5Fの赤記号50とEV文字8を読図。原35設備の代表点を保護し、3Fロッカー室は入場前の場外として別図へ接続。6トイレ区域は男女/多機能を同じ側でまとめ、設備記号数を機械台数へ換算しません。2F救護室は場所一覧のみ。館内AEDの位置は未確認。",
    "館内荷物6/場外荷物16区域、最寄り3駅と新橋・豊洲・大崎の乗換時荷物、個別予約の店舗預かり、周辺7店舗と交通案内を接続。改札内外・時間・予約・専用駐車場を区別。豊洲メトロの個別位置/改札境界、大崎案内の2025年8月以降の配置、精密入口/機械点・連続段差なし動線・当日条件は未確認。候補の旧店名・誤分類・病院利用施設を確認済みにせず非掲載。",
    "4F売店の現金対応は公式フロア本文とFAQの記載が一致しません。画面は電子マネー・カード準備と個別売店確認へ案内し、全売店現金不可を断定しません。",
    "公開利用条件と実機多点タッチ・本番統合は未完。原画像・ロゴを公開しません。",
  ],
  rights: { url: "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/", checkedAt: "2026-09-30", status: "publish-use-unconfirmed", note: "公式著作権表示を確認。再配布/改変図の公開ライセンス・許諾は未確認。原画像は調査用のみで、事実の独自表示と部分輪郭の公開判断は別途必要です。非公開ローカル検証で、許諾取得・外部問い合わせは実施していません。" },
};
