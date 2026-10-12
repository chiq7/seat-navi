import current from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import type { GaishiMode } from "./config";

export function makeGaishiGuide(mode: GaishiMode): DedicatedVenueGuide { return {
  venueId: "gaishi-hall", name: "クロコくんホール（旧日本ガイシホール）", seatTypes: ["スタンド", ...(mode === "bleacher" ? ["ブリージャー席"] : [])],
  seatNote: "公式のA〜P・S区画を列・番号で探せます。E区画の列名は公式図に未掲載です。アリーナは公演ごとの配置です。",
  diagramNote: "館内・共用各階の設備と、金山・名古屋の荷物を区域から探せます。公演当日の開放区域は公演案内をご確認ください。",
  seats: seats[mode].blocks.map(b => ({ id: b.id, label: b.label, type: b.level === "bleacher" ? "ブリージャー席" : "スタンド", floor: b.level === "bleacher" ? "ブリージャー席" : "スタンド", x: b.center[0], y: b.center[1], rows: b.rows.filter(r => r.label).map(r => ({ label: r.label })), sourceIds: b.sourceIds })),
  facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[], sources: current.sources as GuideSource[], routes: [],
  unverified: [
    "現在の公式図の列・番号端・椅子数を照合し、通路で分かれた物理ブロックと欠番を保持。ブリージャー席なし/ありを分離。Eの列名は原図にないため、Mの列名を転用しない。Mは11〜17列で、通路にある18の目印を座席として追加しない。2〜4Fの設備階を区画から推定しない。",
    "現行リンクの2026年4月施設案内図へ主ホールの男女トイレ14・AED3・EV4・自販機2と多目的トイレ4の室代表位置を照合。中央2Fも区域札へ接続。旧1F玄関の自販機は現行図にないため内部退避。公演当日の開放区域と更衣室/プール利用者専用設備を一般客へ保証しない。",
    "FAQのベビーコーナーはレストラン前ロビー区域、軽食堂は串揚屋、2F東西売店はばんだい。共用1F/2Fを有料ホール内と分け、フォーラム2Fの壁で分かれたトイレ2室は別グループ。振興会館前EVは敷地一覧、精密な扉・連続した段差なし経路は作成しない。",
    "館内ロッカーは1Fロビー中央の代表区域。大500円/小200円、FAQの現行収納寸法を使用。個別機器の点・個数・入場前可否・決済は未確認。主催者の貸室は内部情報へ分離し、来場者の荷物へ表示しない。",
    "金山7区域・JR名古屋12区域、タカシマヤ有人預かり・ゲートタワー2Fを接続。原図を別の区域図へ変換し、遠方の荷物で初期会場図を縮めない。一部料金・寸法cm・個別時間・予約は運営元で記載を確認できず固定値にしない。最寄り駅ロッカーと本笠寺の個別出口は公開資料から未確認。",
    "大会に伴う一般利用休止は2026年8月6日〜11月30日。大会の観客入場とは別。復旧後の同一配置・自動再開は未確認。",
    "公式敷地図の北矢印に対応した代表略図へ笠寺駅西口・1F玄関・2F南入口周辺を接続。実測した駅出口/扉位置や公演指定入口ではない。原画像の公開利用条件・連続経路・ユーザー目視と実機多点操作は未確認。",
  ],
  rights: { url: "https://www.nespa.or.jp/sports-plaza/hall/", checkedAt: "2026-10-06", status: "publish-use-unconfirmed", note: "原画像・ロゴは調査用のみ。独立した区域図をローカルへ接続。公開利用条件は未確認。" },
}; }
export const gaishiHallGuide = makeGaishiGuide("fixed");
