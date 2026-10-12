import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import { saitamaFacilityData, saitamaSeats, type SaitamaMode } from "./config";
export function makeSaitamaGuide(mode: SaitamaMode): DedicatedVenueGuide {
  const current = saitamaFacilityData[mode], seats = saitamaSeats[mode];
  return { venueId: "saitama-super-arena", name: "さいたまスーパーアリーナ", seatTypes: ["200レベル", "300レベル", "400レベル", "500レベル"],
    seatNote: "会場モードとレベルを選び、列・番号で探せます。図は改修前の参考配置です。", diagramNote: "1〜5Fの設備と入場前の荷物。改修前の参考図。",
    seats: seats.blocks.map(b=>({ id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label,ranges:r.segments.map(s=>({start:s.start,end:s.end,passage:""}))})),sourceIds:b.sourceIds })),
    facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[], routes: [],
    sources: [...current.sources, { id: `ssa-seat-${mode}`, title: `${mode === "arena" ? "メインアリーナ" : "スタジアム"}モード公式座席案内`, url: "https://www.saitama-arena.co.jp/seats_info/", checkedAt:"2026-10-06", scope:"通路で分かれた輪郭・列・若い番号側。扉位置は座席の担当範囲とは別。", usage:"facts-only" }, {id:"ssa-seat-rules",title:"公式座席検索の列・番号データ",url:"https://www.saitama-arena.co.jp/seat_view/js/seat_list.js",checkedAt:"2026-10-06",scope:"列別の番号区間・有効番号・欠番。",usage:"facts-only"}, {id:"ssa-ticket-level",title:"公式チケットの見方",url:"https://www.saitama-arena.co.jp/seats_info/ticket/",checkedAt:"2026-10-06",scope:"200/300/400/500レベルと2/3/4/5Fの対応。",usage:"facts-only"}, { id:"ssa-renovation",title:"改修休館の案内",url:"https://www.saitama-arena.co.jp/business/",checkedAt:"2026-10-06",scope:"メインアリーナ等は2027年3月末まで休館予定。",usage:"facts-only" }] as GuideSource[],
    unverified: ["改修後の座席・設備配置、当日の使用モード・開放席。", "列線と輪郭は転記略図。全椅子の実測位置・設備までの連続動線ではない。", "設備の全数・個別入口・駅/コクーンの個別ロッカー位置・公開利用条件。けやきは原向きの独立図で、北向きは未確認。", "目視の微調整・実機多点タッチ・ユーザー最終確認。"],
    rights: {url:"https://www.saitama-arena.co.jp/",checkedAt:"2026-10-05",status:"publish-use-unconfirmed",note:"原画像・ロゴは調査のみ。ローカルの事実案内。公開利用条件は未確認。"} };
}
export const saitamaSuperArenaGuide = makeSaitamaGuide("arena");
