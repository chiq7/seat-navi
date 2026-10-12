import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { koshienSeats } from "./config";
export const koshienGuide: DedicatedVenueGuide = {
 venueId:"koshien",name:"阪神甲子園球場",seatTypes:["常設内野","アルプス","外野"],
 seatNote:"内野・アルプス・外野を地図と席種名から探せます。確認できた列別の番号範囲を検索できます。他の列・番号と特殊席は確認中です。公演アリーナ、ステージ、使用席は主催者案内を確認してください。",
 diagramNote:"内野・アルプスと外野の1〜3Fを分けて探せます。球場内にはロッカー・手荷物預かりがありません。入場前の駅・別施設・梅田の予約店舗を確認してください。",
 seats:koshienSeats.blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label,ranges:r.segments.map(s=>({start:s.start,end:s.end,passage:"公式図の列帯・通路。個別入口は確認中"}))})),sourceIds:b.sourceIds})),
 sources:current.sources as GuideSource[],facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],
 routes:[{id:"koshien-station",from:"阪神甲子園駅",exit:"西口・東口",stops:["駅前広場","球場外周"],destination:"阪神甲子園球場",note:"公式外周図の駅出口・駅前広場・球場の位置関係を接続。精密連続経路、段差なし経路、工事中の迂回と当日の使用ゲートは未確定です。球場には駐車場がありません。",sourceIds:["grounds","station","access"]}],
 unverified:[
 "公式全体図と個別7図の印字を照合した166番号範囲・1977列帯を検索へ接続。残る154表示領域と保留列は確認中です。320表示領域を全物理ブロック全数と扱いません。個別椅子位置・特殊席/券種境界・公演アリーナの精密化は後段です。設備階はnullです。",
 "公式2027年間予約席の名称と銀傘拡張（2025年11月〜2028年3月予定）を確認。保存座席図に版日付を確認できず、工事後・各公演の全席適用は確定しません。疑義のある詳細を補間しません。",
 "公式設備図の主要店舗・男女/多目的トイレ・授乳3区域・AED7区域・喫煙区域を部分転記。内野/アルプスと外野、1〜3Fを混ぜません。全店舗/全記号/精密入口/営業条件/券種間通行を確認済みへ変えません。",
 "球場内ロッカー・手荷物預かりなしは一般FAQの確認範囲です。公演独自の預かりは別確認。甲子園プラス2Fロッカーは歴史館営業中のみ、閉館後/休館日に回収できません。入館券が必要か、課金期間と空きは未確定です。",
 "甲子園駅と大阪梅田駅の現行掲載構内図でロッカー記号を確認。個別機械位置・改札内外・時間/料金/寸法/空きは未確認で図外一覧へ。駅FAQの有人預かりなしを保持します。",
 "ビッグエコー梅田駅前本店の運営元対応店と個別予約URLを接続。予約本文はJS案内のみで住所/時間/料金/空きを確認済みにしません。甲子園付近の有人預かり店舗は未確定です。",
 "OpenPOI中心34.7213,135.3616・800mで飲食15候補/荷物0を保存し、候補を確認済み施設へ昇格しません。Livebu指定検索404で会場ページ特定未完。原図/PDF/ロゴはpublicへ複製しません。全境界/全条件/実機多点は後段です。"],
 rights:{url:"https://cdn-zaseki.music-mdata.com/pdf/18791.pdf",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"補助図はLiveWalker作成20250311・転載禁止表示。主要事実の照合に用い、原図/PDF/ロゴをpublicへ複製せず独立した参考図を制作。取得可能を転載許諾と扱いません。"}
};
