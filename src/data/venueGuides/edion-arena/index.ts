import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { edionSeats, type EdionMode } from "./config";
export const edionClosureNote = "2027年1月まで全館休館中です。座席・館内図は改修前の参考。再開日と再開後の配置は公式・主催者の案内を確認してください。";
export function makeEdionGuide(mode:EdionMode):DedicatedVenueGuide {
  return {
    venueId:"edion-arena",name:"エディオンアリーナ大阪",seatTypes:mode === "first" ? ["第1競技場固定席"] : ["第2競技場"],
    seatNote:mode === "first" ? "第1競技場の改修前固定席図です。A〜Hの主要範囲を選べます。前後の英字列と印字端番号、B内側の確認済み区間を部分検索できます。間の未接続番号・公演アリーナ・再開後の配置は確認中です。" : "第2競技場はB2Fの別会場です。改修前の参考輪郭で、座席・列番号・リング・ステージは催しごとの配置です。",
    diagramNote:edionClosureNote,seats:edionSeats[mode].blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:[],sourceIds:b.sourceIds})),
    sources:current.sources as GuideSource[],facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],
    routes:[
      {id:"edion-metro",from:"地下鉄なんば駅",exit:"5番出口",stops:[],destination:"エディオンアリーナ大阪",note:"会場公式の距離350m。指定入口・精密連続/段差なし経路は確認中。全館休館中です。",sourceIds:["access","home"]},
      {id:"edion-nankai",from:"南海なんば駅",exit:"南出口",stops:[],destination:"エディオンアリーナ大阪",note:"会場公式の距離250m。徒歩分数へ換算しません。",sourceIds:["access"]},
      {id:"edion-jr",from:"JRなんば駅",exit:"JR難波・OCAT",stops:[],destination:"エディオンアリーナ大阪",note:"会場公式の距離800m。南海・地下鉄なんばと別の駅です。",sourceIds:["access"]},
    ],
    unverified:[
      "2026-09-17の現行案内と2027年2/3月予約受付PDFを照合。休館は2027年1月まで、工期/再開日は予定です。予約受付を再開済みと扱いません。トイレ等改修後の座席・設備・動線・荷物配置は未確認です。",
      "現在公式リンクの改修前図とLiveWalker補助図を比較。A〜Hの固定3131セルを38通路分離参考範囲へ清書。全物理全数や現行公演席数ではありません。B内側108キーを保護し、他37範囲の前後列と146個別端を追加。84列帯/254キーは部分検索の範囲で、他2877セル番号は未接続です。中間番号を補間しません。青い移動席・公演アリーナを除外します。",
      "B2F第2競技場は固定席番号を持たない別モード。補助サイトの700席を現在の固定座席全数へ採用しません。3・4F合成設備図の個別階、未知の座席から設備階はnullです。",
      "館内5階図の主要トイレと自販機・救護案内を改修前参考へ接続。AED・授乳・多目的トイレの未確認位置を補わず、未掲載目的を無効にします。8ロッカー室は競技者/施設利用者用で観客の一般預かりではありません。",
      "南海/CITY10、パークス2、Metro2、OCAT6ロッカー区域と有人2店舗を図外一覧へ接続。収納内寸/加算条件/空き・未確定時刻は現地確認。Airporter料金/予約条件とOCAT1F新機械の個別区域対応は保留です。",
      "トラベルハブは2026-09-01改定440/750円、9:30〜18:30、最大14日。旧550円や配送料金を店頭預かりへ混ぜません。南海の2Fと本館1Fは始発〜24:10が多く、E/I/Jとパークスは別時間です。",
      "なんば駅現行図は26-Dを2032年3月末まで閉鎖予定、別EVを2026-10-02〜11-06停止予定と掲載。5番出口を全区間段差なしと案内しません。精密入口/連続経路は未確定です。",
      "OpenPOI800mの荷物2/飲食20候補はlicenses/attributionsを保存。API候補だけで確認済み施設へ昇格しません。図の店舗一覧札は実店舗位置ではありません。",
      "PC/スマホ基本操作は変更範囲を確認し、全条件・全札/境界・実機多点は後段です。原図/PDF/ロゴをpublicへ複製しません。",
    ],
    rights:{url:"https://cdn-zaseki.music-mdata.com/pdf/25620.pdf",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"MUSIC-MDATA掲載・LiveWalker作成。事実照合のみ、原図/PDF/ロゴは研究用に保存。ダウンロード可能を転載許可と扱いません。"},
  };
}
export const edionGuide=makeEdionGuide("first");
