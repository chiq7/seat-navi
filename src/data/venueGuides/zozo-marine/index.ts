import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { zozoSeats } from "./config";
export const zozoMarineGuide: DedicatedVenueGuide = {
 venueId:"zozo-marine",name:"ZOZOマリンスタジアム",seatTypes:["常設スタンド"],
 seatNote:"下段・上段・外野を地図と区域名から探せます。「下段1塁側前方」などで前方区域へ絞り、確認済みの前後列を表示します。番号検索は上段の確認済み列・番号と下段・外野の印字開始番号に部分対応。短い前列・その他の番号と特殊席は確認中です。公演の使用席は主催者案内を確認してください。",
 diagramNote:"場内1〜4Fと敷地・駅・店舗を分けて探せます。設備図の点は掲載区域です。公演時の開放・営業と入場ゲートは当日案内を確認してください。",
 seats:zozoSeats.blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label,ranges:r.segments.map(s=>({start:s.start,end:s.end,passage:"通路の個別対応は確認中"}))})),sourceIds:b.sourceIds})),
 sources:[...current.sources as GuideSource[],{id:"official-seat-ui",title:"マリーンズ公式・公開座席選択画面（確認した列・番号）",url:"https://m-ticket.marines.co.jp/ticket/20261123",checkedAt:"2026-10-11",scope:"11月23日公開図の座席情報を限定閲覧。確認した列・番号のみ採用し、料金・空き・公演適用へ転用しない。参考図上の点は椅子中心ではない。",usage:"facts-only"}],facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],
 routes:[{id:"zozo-kaihin",from:"海浜幕張駅",exit:"南口",stops:["幕張メッセ周辺"],destination:"ZOZOマリンスタジアム",note:"JR京葉線海浜幕張駅南口から公式徒歩案内は約15分。歩道橋を含みます。精密連続経路・段差なし経路・当日の使用ゲートは未確定です。",sourceIds:["access","walk"]}],
 unverified:["20250306 LiveWalker作成の補助座席図から通路で分かれた322参考領域を整理し、現行公式主要輪郭と比較。322を全物理ブロック数と扱いません。公式席種ページ本文は2025表記、2026資産の存在だけで全席現行適用へ昇格しません。",
 "番号の部分接続は114参考区域/159番号確認列帯/198キー（公式96・印字先頭102）。列端のみ81領域と、番号付き39領域の追加前後端を分けて表示。下段前方26/上段前方51の確認済み列端、上段後方の37〜55列内の確認範囲を接続。短い37列の481/461番周辺4領域は番号未確認のままです。前方区域検索には列未確認の短い列・WD周辺も含めます。公式内野指定席S画面で個別番号を確認できなかった範囲を席不存在とは扱いません。残る127参考領域の個別列/番号、灰色後方6取得キー・CF、3塁181の23/24列と特殊席精密対応は確認中です。番号間・他列・椅子中心を補間せず、設備階nullです。",
 "2026公式グルメ図から1〜4F店舗・主要男女トイレ・AED区域、公式キッズからベビールーム/mamaro/ベビーカーを接続。3Fの男女/車いす記号区域も接続。他階の未転記多目的トイレ・喫煙等を不存在としません。mamaroの期間終了、公演時の設備開放は未確定です。",
 "球場ロッカー3区域は2026年6月19日変更を反映。場内209は入場後・球場営業/入場時間内です。屋外の営業記述を常時敷地立入へ拡張しません。全寸法・決済・空き・公演運用は未確認です。",
 "海浜幕張の現行運営者3改札外ロッカーは図外一覧。旧駅記事の2区域と二重計上しません。東京駅の掲載区域と有人カウンターも一覧、個別機械の現行位置/料金/入口は確認中です。",
 "ビッグエコー海浜幕張店は運営元の対応店舗と個別予約URLを接続。予約ページ取得本文はJS案内のみで、住所・受付時間・料金・空きを確認済みへ変更しません。ecbo/旧店舗候補は個別現行確認待ちです。",
 "OpenPOI中心35.645,140.0309・800mで飲食候補15/荷物0を保存。候補を確認済みへ自動昇格せず、0件を荷物施設不存在としません。Livebu検索URLは404で会場ページ特定未完。全札/境界/条件の最終比較と実機多点は後段です。"],
 rights:{url:"https://cdn-zaseki.music-mdata.com/pdf/9887.pdf",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"補助図はLiveWalker作成・20250306、転載禁止表示あり。原図/PDF/ロゴをpublicへ複製せず、事実を確認した主要範囲から独立した参考図を作成。取得可能を転載許諾とは扱いません。"}
};
