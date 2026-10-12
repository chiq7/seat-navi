import current from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
export const budokanGuide: DedicatedVenueGuide = {
  venueId:"budokan",name:"日本武道館",seatTypes:["1階スタンド","2階スタンド"],
  seatNote:"方角・階と列・番号で探せます。アリーナと使用席は公演ごとの配置です。",
  diagramNote:"館内の階・方角と、入場前の公園設備・駅のロッカーを探せます。",
  seats:seats.blocks.map(b=>({id:b.id,label:b.label,type:b.level === "1F" ? "1階スタンド" : "2階スタンド",floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label,ranges:r.segments.map(s=>({start:s.start,end:s.end,passage:b.area}))})),sourceIds:b.sourceIds})),
  facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],sources:current.sources as GuideSource[],routes:[],
  unverified:["2025年の印字座席資料を基にした参考検索。大会の団体割当番号・公演別アリーナ・立見Y列は含めない。収録席数を収容人数/販売席数とみなさない。",
    "1階K列の北/北東/東/西/北西と2階北西R列の読み取れない1番号は未収録。空白を欠番や販売不可と断定しない。",
    "輪郭・通路を清書した略図。列線と番号の目印は実測位置や全列共通の端番号ではない。",
    "1階スタンドの設備階を接続。2階スタンドは建築上の2/3階と各列の対応/設備経路が未確認のため設備階を変更しない。",
    "授乳室・南側EV・2階南東AED・B2AEDは場所一覧。室入口/停止階/段差なし経路は未確認。中道場は本館と別。",
    "公園の11原記号を保持。原図と同じ表示回転だけを適用。駅出口/店舗入口/歩行経路の精密点は未確認。",
    "館内ロッカーなし。駅の5設置区域を場所一覧へ接続。竹橋/6番出口付近の改札境界、未掲載の料金・予約機械・空きは未確認。",
    "有人預かり候補は運営告知/現行施設案内/ecboを調査。現行個別予約条件が未確認のため非掲載。原画像の公開利用・最終目視・実機多点入力は後段。"],
  rights:{url:"https://www.nipponbudokan.or.jp/",checkedAt:"2026-10-06",status:"publish-use-unconfirmed",note:"原画像/ロゴは調査用のみ。出典別に清書した部分略図のローカル確認段階。公開条件は本番統合時に確認。"},
};
