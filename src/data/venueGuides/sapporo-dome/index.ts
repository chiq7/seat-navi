import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { sapporoSeats, type SapporoMode } from "./config";
export function makeSapporoGuide(mode:SapporoMode):DedicatedVenueGuide {
 const data=sapporoSeats[mode];
 return {venueId:"sapporo-dome",name:"大和ハウス プレミストドーム（札幌ドーム）",seatTypes:["スタンド"],
 seatNote:`${mode === "baseball" ? "野球・コンサート" : "サッカー"}モードの常設席参考図です。北・南・東・西側から区画を選べます。通路名（例：86通路）で周囲を表示し、地図の区画を選べます。通路検索は列・席の確定ではありません。19列の開始側代表8キーと、43・45通路間21番側の奇数列・41/43列を部分検索できます。追加列の目印は参考位置で、ほかの番号・券種境界・特殊席・公演アリーナは確認中です。`,
 diagramNote:"フロア図は北が左・東が上。敷地図は別の向きです。入口中心・連続経路は未転記です。",
 seats:data.blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label})),sourceIds:b.sourceIds})),
 sources:current.sources as GuideSource[],facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],
 routes:[{id:"sapporo-fukuzumi",from:"地下鉄東豊線 福住駅",exit:"3番出口",stops:[],destination:"大和ハウス プレミストドーム",note:"公式目安徒歩約10分。段差なし連続経路・当日の入場口は別途確認してください。",sourceIds:["access","grounds"]}],
 unverified:[
 "公式公開2024PDFの輪郭をモード別の参考領域として整理。全物理ブロック数ではありません。券種境界・車いす/スイート等の特殊席との全対応は未確認です。",
 "各モードの既存西21番側115キーを保持し、19列の若い側8キーを追加（計123キー）。正式通路名22か所と、東/北/南/西の代表前後列を原図へ接続。番号未接続の列は目印だけを表示します。39列の横通路を不存在へ変えません。全列/全番号/欠番と個別席の精密位置は後段です。",
 "両モードで館内設備の共通一覧を使用。公演による営業・開放、トイレ男女変更、B2F関係者・4F専用区域の利用条件は個別案内へ保持。未確認の設備階と座席階の対応はnullです。",
 "館内5・入場前2の会場ロッカー区域、福住駅・さっぽろ駅・JR札幌駅・ヤマト3店舗へ接続。駅の改札内外と機械別料金/個別位置、店舗受付開始・制限・予約/空きは未確認です。",
 "OpenPOI800mの候補7件中、ファミリーマート札幌ドーム前のみ公式個別ページで照合し一覧へ接続。0件の荷物応答は不存在ではありません。終了したJR臨時預かり、ホテル配送は現行常設預かりへ昇格していません。",
 "各階/敷地の区域点を部分読図。店名検索/図外一覧/個別詳細に接続。室入口・連続歩行経路・全点の最終比較、実機多点・全条件の受入は後段です。基本操作の実施範囲は調査記録へ記載します。"],
 rights:{url:"https://zaseki.music-mdata.com/detail/24233/1",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"原PDF/画像/ロゴをpublicへ複製していません。独立した部分参考図で、取得可能を転載許諾とは扱いません。"}
 };
}
export const sapporoDomeGuide=makeSapporoGuide("baseball");
