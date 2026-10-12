import current from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import type { MarineMode } from "./config";

export function makeMarineGuide(mode: MarineMode): DedicatedVenueGuide {
  return {
    venueId: "marine-messe", name: "マリンメッセ福岡A館", seatTypes: ["1階席", "2階席"],
    seatNote: "ブロック名・列・番号で探せます。アリーナ・使用席・番号は公演案内を優先してください。",
    diagramNote: "A館1F・2Fの設備と場外ロッカーを探せます。ベイサイドのA館/C館は会場とは別施設です。",
    seats: seats[mode].blocks.map(b => ({ id: b.id, label: b.label, type: b.level === "1F" ? "1階席" : b.level === "2F" ? "2階席" : b.level, floor: b.level, x: b.center[0], y: b.center[1], rows: b.rows.map(r => ({ label: r.label })), sourceIds: b.sourceIds })),
    facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[], sources: current.sources as GuideSource[], routes: [],
    unverified: [
      "現行公式図の正式区画はコンサート17/センター19。通路で分けた物理ブロックは100/116。D/Eをコンサートに追加しない。中央の公演別アリーナ・ステージを固定しない。B館には転用しない。",
      "公式図の番号端と可視椅子数を照合し、列別の欠けと区間を保持。確認した座席キーはコンサート6641/センター7921。会場全席数・公演の販売席数ではない。D/Eの前方の小さな斜辺2ブロックは番号検索未対応。図形・列位置は転記略図で椅子ピンや実測ではない。",
      "1F A〜Gと2F H〜Sは原図の点線凡例を照合。1階の全区画を固定席とは断定しない。可動・せり上がり・使用座席は公演別。",
      "49設備記号と11引出線候補を原ID・原座標で保持。トイレ室内の記号は室の代表区域、引出線付きの設備は同一階の終点。残りは場所一覧で、記号中心を精密な機器位置と断定しない。",
      "屋外トイレ・外壁/正面入口外側の自販機は場外一覧に分離。防災センターは一般入室案内ではない。レストラン・館内ロッカーの入場前利用/営業は公演別。",
      "呉服町/中洲川端/天神/博多駅とベイサイドの荷物は一覧。個別出口・精密なロッカー点・空き・歩行経路は未登録。OpenPOI800m検索0件から不存在を断定しない。",
      "原画像の公開利用条件・ユーザー最終目視・実機多点操作は未確認。制作側のPC/スマホ幅の表示・基本操作確認は別途記録する。",
    ],
    rights: { url: "https://www.marinemesse.or.jp/policy", checkedAt: "2026-10-05", status: "publish-use-unconfirmed", note: "公式原画像・SVG・ロゴは調査用のみ。独立区域略図はローカル確認段階。" },
  };
}
export const marineMesseGuide = makeMarineGuide("concert");
