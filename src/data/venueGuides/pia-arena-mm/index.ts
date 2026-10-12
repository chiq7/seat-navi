import evidence from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";

export const piaArenaMmGuide: DedicatedVenueGuide = {
  venueId: "pia-arena-mm", name: "ぴあアリーナMM",
  seatNote: "1Fアリーナは公演ごとの配置です。2〜4FのL・C・R側から探せます。",
  diagramNote: "1〜4Fの設備と場外・入場前の案内。記号代表点は室入口や歩行経路を示しません。",
  seatTypes: ["2F", "3F", "4F"], seats: seats.blocks.map(b => ({ id: b.id, label: b.label, type: b.level, floor: b.level, x: b.center[0], y: b.center[1], rows: b.rows.map(r => ({ label: r.label })), sourceIds: b.sourceIds })), routes: [],
  facilities: evidence.facilities as GuideFacility[],
  diagrams: evidence.diagrams as GuideDiagram[],
  sources: [...evidence.sources, ...[2,3,4].map(f => ({ id: `pamm-seat-${f}-current`, title: `${f}F公式座席図`, url: "https://pia-arena-mm.jp/seatmap/index.html", checkedAt: "2026-10-07", scope: `${f}Fの${f === 4 ? 6 : 7}詳細図と全体図を列別に照合。通路別ブロック・印字番号・構造上の空白を接続。立見・車いす替え配置は番号席へ含めない。`, usage: "facts-only" as const })), ...[2,3,4].flatMap(f => Array.from({length:f === 4 ? 6 : 7}, (_, i) => ({ id: `pamm-seat-${f}-detail-${i+1}-current`, title: `${f}F公式詳細座席図 ${i+1}`, url: `https://pia-arena-mm.jp/assets/images/seatmap/f${f}_${i+1}.jpg`, checkedAt: "2026-10-07", scope: "各印字列の番号端・通路の抜け・欠けを目視照合。重複掲載部分を1度だけ接続。図形と列線は目安で椅子の実測位置ではない。", usage: "facts-only" as const })))] as GuideSource[],
  unverified: [
    "公式20詳細図の2F22/3F20/4F20通路ブロック・394列レコード・5585重複しない席キーを接続。印字がない構造空白・立見・車いす替え配置は番号席へ含めません。席キー数は公演販売席数や容量ではなく、図形と列線は目安で個々の椅子を定位しません。",
    "L01等はその階に印字された後方出入口付近の位置検索であり、座席の列番号・担当席範囲・公演入場口ではありません。4Fに印字がないC19/20/22/23・R24〜28を追加しません。立見/車いす替え配置は公演案内で確認します。",
    "館内ロッカーの寸法・料金・小銭とGate P側の両替機を接続。各室のサイズ対応・入場前利用可否、個別入口・連続した段差なし動線は未確定。駅12設置区域と近隣2予約施設は文章一覧で、改札内外・決済・予約リンクへ接続。横浜駅は別区域。",
    "CLUB 38の館内3F/館外1Fの入口説明を一覧へ接続。1F A/P・2F P/Iは別原座標の館外図、2F館外多目的トイレ/チケットボックス/The Blue Bellは原記号の代表位置へ接続。精密な室入口・公演指定入口・連続経路は未確定です。",
    "館内外15階段とRENGA3か所、周辺の飲食/コンビニ/薬局/ATM/赤ちゃん設備10件を接続。商業施設の実階と利用境界を保持し、会場の館内設備へ混ぜません。周辺API候補の全件確認、AED位置、双眼鏡受取機の現行設置点は未確認です。",
    "公開利用条件と実機多点タッチ・本番統合は未完。原画像・ロゴを公開しません。",
  ],
  rights: { url: "https://pia-arena-mm.jp/", checkedAt: "2026-09-30", status: "publish-use-unconfirmed", note: "公式フッターの無断転載制限を確認。原画像/ロゴは調査用のみ。独自の事実表示と部分輪郭・データ集合の公開判断は別途必要です。非公開ローカル検証で、許諾取得・外部問い合わせは実施していません。" },
};
