import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { makuhariSeats, type MakuhariMode } from "./config";

export function makeMakuhariGuide(mode: MakuhariMode): DedicatedVenueGuide {
  return {
    venueId: "makuhari-messe", name: "幕張メッセ", seatTypes: mode === "event" ? ["2F常設席","3F常設席"] : ["展示1〜8","展示9〜11"],
    seatNote: mode === "event" ? "イベントホールの常設席の参考図です。A〜K・BOXと階を選べます。通常席はB1などの区画＋列と席番号で部分検索できます。A・Fは9・10列の印字端番号だけ確認済みです。間の番号、BOXの個別番号、可動席と公演アリーナは確認中です。" : "展示ホール1〜11の位置を探せます。席番号・ステージ・当日の入場口は公演ごとの案内をご確認ください。",
    diagramNote: "イベントホールと展示場は別の棟です。設備は棟と実際の階を選んでください。使用する入口・開放区域は公演によって異なります。",
    seats: makuhariSeats[mode].blocks.map(b => ({ id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:[],sourceIds:b.sourceIds })),
    sources: current.sources as GuideSource[], facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[],
    routes: [
      { id:"makuhari-kaihin",from:"海浜幕張駅",exit:"南口",stops:[],destination:"幕張メッセ",note:"会場への公式目安は徒歩約5分。イベントホールの指定入口までの時間ではありません。精密連続/段差なし経路は未確定です。",sourceIds:["access"] },
      { id:"makuhari-toyosuna",from:"幕張豊砂駅",exit:"JR京葉線",stops:[],destination:"幕張メッセ",note:"公式目安は徒歩約20分。公演の指定入口は券面と主催者案内を確認してください。",sourceIds:["access"] },
      { id:"makuhari-hongo",from:"幕張本郷駅",exit:"バス乗り場1",stops:["幕張メッセ中央"],destination:"幕張メッセ",note:"バス約17分。運行・混雑・指定入口を確認してください。図の札は位置関係で連続経路を示しません。",sourceIds:["access"] },
    ],
    unverified: [
      "現在公式がリンクするイベントホール固定席図の図内日付は2006.07.01。補助LiveWalker図と主要輪郭/通路・通常3488印字を照合。A/Fの20固定範囲に9・10列と80印字端を追加。81参考範囲と438列帯は全物理全数・現行公演販売席数ではありません。青い可動席・公演アリーナを常設席へ混ぜません。",
      "A/F計400セルの輪郭と9・10列の若い側/印字端80キーを接続。中間320キーは未接続で補間しません。BOX60の個別列/番号・可動席配置・車いす5×2空間の公演使用・全境界と全札の最終比較は後段。券面階から設備階の未確認対応はnullです。",
      "館内主要設備は9棟階、敷地/駅アクセス/海浜幕張周辺を分離。原図記号の代表区域・図外一覧です。全記号、精密入口、連続段差なし経路と公演時の入場/閉鎖は未確認です。",
      "中央モール7・エスプラナード2・イベントホール4・屋外2のロッカー区域を接続。機械台数ではありません。イベントホール小型は来場者限定300円。普通400/500/700円、8〜20時・24時加算・最大3日を区別します。",
      "海浜幕張周辺7ロッカー区域は図外一覧。JR記事は2025年更新で機械運営元の個別URLは404。南口左側のサイズ/料金不一致、最新の機械・駅時間・空きは保留。店舗営業時間を預かり受付へ転用しません。",
      "2019ecbo記事と2個別店舗404は現在の受付を確定できず、有人預かり店舗を公開施設へ昇格しません。OpenPOI800mの荷物0/飲食20候補をlicenses/attributions付きで保存し、候補を確認済みへ昇格しません。",
      "PC/スマホの主要導線を確認し、実機多点入力、全条件/全境界の最終比較は後段へ残します。原図/PDF/ロゴはpublicへ複製しません。",
    ],
    rights: { url:"https://cdn-zaseki.music-mdata.com/pdf/24465.pdf",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"MUSIC-MDATA掲載・LiveWalker作成図。公式と補助の事実照合だけに使い、原図/PDF/ロゴは研究用に保持。ダウンロード可能を転載許可としません。" },
  };
}
export const makuhariGuide = makeMakuhariGuide("event");
