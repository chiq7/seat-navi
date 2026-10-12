import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { tokiSeats, type TokiMode } from "./config";

export function makeTokiGuide(mode: TokiMode): DedicatedVenueGuide {
  return {
    venueId:"toki-messe",name:"朱鷺メッセ",seatTypes:[mode === "exhibition" ? "展示ホール" : "メインホール"],
    seatNote:mode === "exhibition" ? "展示ホールA/Bの場所を探せます。アリーナ・スタンド・ステージ・列・席番号は公演ごとの配置です。券面と主催者の座席図をご確認ください。" : "会議場2Fのメインホール（スノーホール）です。展示ホールとは別室です。列・席番号・ステージは催事ごとの配置です。",
    diagramNote:"公式の部屋・設備の位置関係を整理した独立区域図です。現在の公演座席図・精密入口・連続経路を示すものではありません。",
    seats:tokiSeats[mode].blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.equipmentFloor!,x:b.center[0],y:b.center[1],rows:[],sourceIds:b.sourceIds})),
    sources:current.sources as GuideSource[],facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],
    routes:[
      { id:"toki-bus",from:"新潟駅",exit:"1Fバスターミナル17番",stops:["朱鷺メッセ"],destination:"朱鷺メッセ",note:"佐渡汽船線で約17分は乗車時間。公演指定入口までの時間ではありません。",sourceIds:["bus-current"] },
      { id:"toki-walk",from:"新潟駅",exit:"万代橋方面",stops:["万代橋"],destination:"朱鷺メッセ",note:"公式の徒歩目安は約25分。旧市街図の駅前バス乗場と現在の高架下乗場を混同せず、入口は主催者の案内へ。",sourceIds:["access-current","access_townmap"] },
    ],
    unverified:[
      "公式は無柱の展示ホールA/Bと別室メインホールを案内。部屋3範囲だけを接続し、常設の客席ブロック・全物理全数とは数えない。公演共通の列・席番号・若い側は確認できないため、架空の席や矢印を補わない。",
      "MUSIC-MDATA掲載/LiveWalker作成18546.pdfは図中に配置例（サンプル）・無断転載再配布禁止と明記。ライブ部は展示/メイン別ページを確認。同じ補助図は独立根拠に数えず、サンプルの列/番号/スタンドを現在の公演へ転用しない。図内版/日付は未記載。",
      "公式各階PDFと館内案内を照合して主要設備を接続。別室の車いすトイレを分離。全設備の台数・精密入口・通路線・公演時の開放は未確認。万代島ビル2F店舗は会議場2Fへ混ぜない。",
      "館内荷物は1F返金式28口、2F返金式168口と大型有料8口を別条件で接続。空き・公演の利用境界・大型有料の支払い方法、屋外ロッカー/一般クロークは未確定。入場前一覧にも同一IDで到達でき、二重計上しない。",
      "新潟駅ロッカーはJR公式Webで有を確認し保存GET403。個別階/機械位置/改札内外/料金時間は未確定。佐川は2F EAST SIDE・預かり10〜20時/店舗10〜20:30・700円/日を照合。旧JR荷物図の西口/受付時間を改修後へ確定しない。",
      "OpenPOI中心半径800m・荷物1/飲食20候補のlicenses/attributionsを保持。荷物候補は運営元未確認で接続しない。場外は公式の区域・駅/バス・店舗一覧で、精密敷地/出口座標/入口・段差なし連続経路は未制作。",
      "PC/スマホの主要導線を確認し、実機多点・全札/全条件の最終比較は後段。追加詳細持越しを全仕様適合・数値90%以上・全確認済みとしない。",
    ],
    rights:{url:"https://www.tokimesse.com/copyright/",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"公式は無断複製・改変・転載等を禁じ、リンクには事前連絡を案内。補助PDFも転載再配布禁止。原図/PDF/ロゴはpublicへ複製せず調査用。リンク/公開利用条件の確認は公開前の残作業。"},
  };
}
export const tokiGuide=makeTokiGuide("exhibition");
