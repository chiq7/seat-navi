import current from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
export const yoyogiGuide: DedicatedVenueGuide = {
  venueId:"yoyogi",name:"代々木第一体育館",seatTypes:["北1階","南1階","北2階","南2階"],
  seatNote:"北・南の1階/2階スタンドを表示。アリーナは公演ごとの配置です。",diagramNote:"設備のB1F/1F/2Fはチケットの1階/2階とは別です。",
  seats:seats.blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label})),sourceIds:b.sourceIds})),
  facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],sources:current.sources as GuideSource[],routes:[],
  unverified:["JSCの44区画詳細図の606印字列・8,636印字セルを通路/空白で72参考ブロックへ分離。会場容量や当日の販売席数ではない。I・車いす代替席・公演アリーナは検索対象に補わない。",
    "形・等間隔の列線は独立した略図。HTMLの全体位置と個別セル図の比率を対応させた参考表示であり、椅子の実測位置ではない。北1Lの1列37番等の特異な印字を連番へ修正しない。",
    "券面階と建築上の設備階は未確定でnull。AED/自販機/オストメイト室の個別対応は階未確認一覧。バリアフリー6室とオストメイトの存在案内は同一室の可能性があり室数として合算しない。",
    "B1F14分類済み記号と、B1F/1Fの車いす記号6点を室内器具と照合。来賓・会議室は一般ロビーと分離し、設備全数/入口/開放は未確認。",
    "館内ロッカーなし。原宿・明治神宮前・代々木公園・渋谷の駅ロッカーと店舗預かりを場所一覧へ接続。精密な機械点・一部改札境界・料金・空き・連続動線は推定しない。館外EV2機を館内へ移さない。",
    "公演別入口・経路・設備利用可否、公開利用条件、ユーザー目視・実機タッチは未確認。"],
  rights:{url:"https://www.jpnsport.go.jp/yoyogi/",checkedAt:"2026-10-06",status:"publish-use-unconfirmed",note:"JSC原画像・ロゴは調査のみ。独立した部分略図をローカル接続。公開利用条件は未確認。"},
};
