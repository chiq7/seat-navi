import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { bellunaSeats } from "./config";
export const bellunaDomeGuide: DedicatedVenueGuide = {
 venueId:"belluna-dome",name:"ベルーナドーム",seatTypes:["常設スタンド"],
 seatNote:"2026公式の常設席参考図です。1塁・3塁の内野SS/S/A/B/C、ネット裏と後方外野の確認済み範囲は列・番号で部分検索できます。表示番号は原図の目印で、同じ番号付近の券種や通路の前後は別区画です。ほかの列・番号と公演アリーナは確認中です。",
 diagramNote:"座席図と設備図は向きが異なります。室入口・連続経路は未転記です。当日の入場口と利用範囲は主催者案内を確認してください。",
 seats:bellunaSeats.blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label})),sourceIds:b.sourceIds})),
 sources:current.sources as GuideSource[],facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],
 routes:[{id:"belluna-station",from:"西武球場前駅",exit:"駅改札",stops:[],destination:"ベルーナドーム",note:"狭山線・山口線の西武球場前駅が最寄りです。駅からの当日入場先と段差なし連続経路は個別案内を確認してください。",sourceIds:["access","station"]}],
 unverified:["2026公式PDFの色付き輪郭を参考領域へ整理。301表示領域を全物理ブロック数とは扱いません。全列番号・欠番・券種境界・特殊席の精密対応と公演アリーナは後段です。",
 "後方6外野区画73列帯525キーを保持し、内野SS/S/A/B/Cの両側とネット裏の別券種・前後に16参考範囲254列帯1698キーを追加。確認済み22範囲以外は番号確認中です。左右の端番号は個別に照合し、C席は29〜38列だけを接続。後方の短い列や別色の車いす区域を通常席へ混ぜません。この数は会場全席数や転記率ではありません。若い側・列線は原図の位置の目安で、椅子の精密中心ではありません。LiveWalker20220119補助図は新規内野・ネット裏番号の根拠へ使いません。",
 "施設図の区域点・場内店舗、別棟の階と専用ラウンジ、敷地・最寄り駅・乗換駅・予約店舗を一次接続。営業日・券種の利用条件、トイレ変更、精密入口・連続経路は未確定を保持。設備階が未確定の座席はnullです。",
 "公式FAQはドーム内ロッカーなし。敷地図の駅/狭山スキー場周辺のロッカー記号は同じ境界と扱わず、狭山スキー場の個別利用条件/現行設置と屋外常設預かりは未確定。西武球場前・西所沢・所沢のSPACER4か所は改札内で、会場券だけでは利用できません。",
 "西武球場前駅は2026〜2029年度に改修。現在のSPACER掲載位置を図外一覧へ接続し、改修後配置・機械の精密点へ昇格しません。所沢の予約店舗の受付時間・入口・駅出口経路は予約画面で確認。空き状況は未確認です。",
 "OpenPOI800mの飲食候補5/荷物0を保存。0件を施設不存在へ扱わず、公式場内Green Forest以外の候補は個別公式照合待ち。Livebu検索は当該会場ページ特定未完。全境界/札/全条件最終比較と実機多点入力は後段です。"],
 rights:{url:"https://www.seibulions.jp/cmn/images/ticket/2026/dome/seat_2026.pdf",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"原図・PDF・ロゴはpublicへ複製していません。公開PDFの取得可能を転載許諾とは扱わず、独立した部分参考図を作成しています。"}
};
