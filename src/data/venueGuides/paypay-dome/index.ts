import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
import primarySeatSources from "./primary-seat-sources.json";

export const paypayDomeGuide: DedicatedVenueGuide = {
  venueId: "paypay-dome", name: "みずほPayPayドーム福岡",
  seatTypes: ["前方", "中段", "後方", "外野"],
  seatNote: "常設席の参考図です。前方・中段・後方・外野と1塁側・3塁側から区画を選べます。両側の主要エリアで確認済みの列・番号を部分検索できます。候補が複数あるときは席種と場所を選んでください。他の列番号・特殊席・公演別アリーナは確認中です。",
  diagramNote: "1〜6Fの設備と、入場前のデッキ・駅・周辺店舗を分けて探せます。北上の位置関係の略図で、室の入口や歩行経路ではありません。",
  seats: seats.blocks.map(b => ({ id:b.id, label:b.label, type:b.level, floor:b.level, x:b.center[0], y:b.center[1], rows:b.rows.map(r => ({label:r.label})), sourceIds:b.sourceIds })),
  sources: [...current.sources, ...primarySeatSources] as GuideSource[], facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[],
  routes: [{id:"paypay-tojin-access",from:"福岡市地下鉄 唐人町駅",exit:"3番出口",stops:[],destination:"みずほPayPayドーム福岡",note:"公式目安は徒歩約15分。3番出口を段差なし経路とは扱いません。当日の入場ゲート・通行規制は主催者案内をご確認ください。",sourceIds:["access","station"]}],
  unverified: [
    "20240426補助図の行帯を参考位置として使用。主要区画の結合行帯と通路を分離した219参考領域で、全物理ブロック数・全席数・現行券種境界ではありません。全区画・特殊席との精密対応は未確認です。",
    "両側の前方・中段・後方・外野の主要9区画で118列の実在区間を公式詳細JPGへ照合。後方15通路・外野25通路の抜けは欠番として保持します。他の列番号、普通席の未表示細片、2026年改修後の特殊席・席種は確認中です。",
    "保存公式フロアマップの掲載点を使用。現在のブラウザで1F/3Fを部分照合。全階・全点・室入口の最終比較は未実施。トイレ4か所は同位置の男女差し替えがあるため固定の男女区分へ昇格しません。",
    "館内座席の階と設備階の対応は未確定でnullを保持。4F Premium Suite・5/6F SuperBOX等の専用区域を通常のスタンドから自由に利用できるとは案内しません。",
    "デッキと外周のロッカー掲載点、4/6/7ゲートの決済案内、唐人町駅・博多駅・Crostaを接続。機械ごとの収納サイズ・現行料金・開放時間・予約条件と空き、館内別ロッカーの調査範囲は未確定です。",
    "周辺はドーム外飲食店とMARK IS別棟1〜4Fのロッカー・階別利用時間を部分接続。駅公式周辺地図の代表点と会場ゲートを同じ略図へ接続し、3番出口の階段と徒歩約15分を文字案内。正確な出口位置・店舗入口・連続経路は未転記です。OpenPOI800m荷物検索の0件は施設不存在を意味しません。",
    "PC1440・スマホ390の部分番号検索/確認中案内/複数候補/区画選択/復帰、設備切替/固定集合/図外一覧/個別詳細と場外荷物を代表操作で確認。PCの100pxドラッグで選択とscrollY保持、320/768の横はみ出しなしを確認。全札/全境界/全条件の比較、実機多点、ユーザー最終目視は未実施です。",
  ],
  rights: {url:"https://zaseki.music-mdata.com/detail/13568/1",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"原PDF・原画像・ロゴはpublicへ複製していません。座席は独立した部分参考図。取得可能を転載許諾として扱いません。"},
};
