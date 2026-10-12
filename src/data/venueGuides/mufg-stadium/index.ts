import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import seatDetails from "./seat-detail-sources.json";
import { mufgSeats } from "./config";
export const mufgGuide: DedicatedVenueGuide = {
 venueId:"mufg-stadium",name:"MUFGスタジアム（国立競技場）",seatTypes:["1層","2層","3層"],
 seatNote:"1〜3層の公式ブロックを地図や101ブロックなどの名称から探せます。列を確認できたブロックは「ブロック名＋列」にも対応。席番号検索は印字を確認できた一部の列だけです。他の席番号・特殊席・改修後の配置は確認中。公演アリーナ・当日の使用席は主催者案内を確認してください。",
 diagramNote:"1層は1F、2層は2F、3層は4Fです。3Fコンコースは改修中。館内・敷地の一般荷物預かりは未確定のため、駅や予約店舗の利用条件を確認してください。",
 seats:mufgSeats.blocks.map(b=>({id:b.id,label:b.label,type:b.level,floor:b.equipmentFloor??b.level,x:b.center[0],y:b.center[1],rows:b.rows.map(r=>({label:r.label,ranges:r.segments.map(s=>({start:s.start,end:s.end,passage:b.label}))})),sourceIds:b.sourceIds})),
 sources:[...current.sources,...seatDetails] as GuideSource[],facilities:current.facilities as GuideFacility[],diagrams:current.diagrams as GuideDiagram[],
 routes:[{id:"mufg-toei",from:"国立競技場駅",exit:"A2出口",stops:["会場外構"],destination:"MUFGスタジアム",note:"公式案内は徒歩1分。使用ゲートは券面を確認。図は区域の位置関係で、精密な連続経路・段差なし経路ではありません。",sourceIds:["access","grounds"]},{id:"mufg-jr",from:"千駄ケ谷駅・信濃町駅",exit:"個別出口は確認中",stops:["会場外構"],destination:"MUFGスタジアム",note:"公式案内は各徒歩5分。外苑前駅は3番出口から徒歩9分。一般駐車場・駐輪場は利用できません。",sourceIds:["faq","access"]}],
 unverified:[
 "現行公式検索の166ブロック名とクリック輪郭を照合した参考区域。全物理ブロック全数・全列番号・全席の現在位置を確認したものではありません。改修注意を保持し、普通席/車いす/特殊席・券種境界と公演アリーナの精密化は後段です。",
 "現行公式166個別図の普通席列軸を照合し、3063のブロック/列対応を名称と列の検索へ接続。1層46・2層62・3層58ブロックの確認済み列に対応。席番号は162ブロック・明示列316行帯・7019キーの部分対応。108中央通路、103/3列・134/1列、212/245/262の番号と普通席範囲、235/239の灰色14列は保留。323/324/352/353は普通席1〜5列名と1列印字番号だけ対応し車いす番号1〜12を混ぜません。322/22列111〜122、354/22列213〜228の短い範囲を保持。中間番号は補間せず、166区域は公式全体図の参考対応。302の左右通路切欠きと323/324/352/353の普通席L字範囲を保存済み個別図で補正しました。通路幅・車いす席の精密位置は未確定。主要席検索の十分さ/基本受入/9割判定は統合確認へ提出します。",
 "現行設備図の主要記号と飲食32区域を部分転記。1F/2F/4F・5F空の杜を区別し3F改修閉鎖を保持。全記号・精密入口・当日開放・VIP間通行の全条件は未確認です。",
 "会場FAQ・現行設備図に一般ロッカー/手荷物預かりの確定情報を確認できず、館内/敷地に不存在とは断定しません。駅と予約店舗を代替導線として接続。外苑前駅ロッカーの個別現行位置・条件は未確定です。",
 "国立競技場駅3区域は都営個別案内の改札外、寸法/口数を接続。直接GETは防御画面、公式Web読み取り本文で確認。料金・利用時間・空きと個別機械点は未確認。運営元受付時間を機械利用時間へ変換しません。",
 "JR千駄ケ谷/信濃町のロッカー有無は駅別設備検索で確認。駅の汎用アイコン凡例から個別位置・改札内外を推定しません。新宿2区域/予約店舗は乗換駅の導線で、近隣施設として最初の地図へ混ぜません。",
 "OpenPOI中心35.6779,139.7145半径800mの飲食15候補/荷物0をlicenses/attributions付きで保存。候補を確認済みへ昇格しません。Livebu指定検索404で会場ページ特定未完。補助図の古い徒歩分数を現行アクセスへ移植せず原図/PDF/ロゴをpublicへ複製しません。全境界/全条件/実機多点は後段です。"],
 rights:{url:"https://cdn-zaseki.music-mdata.com/pdf/27760.pdf",checkedAt:"2026-10-10",status:"publish-use-unconfirmed",note:"LiveWalker作成20251128、無断転載・再配布禁止。事実の照合に使用し原図/PDF/ロゴはpublicへ複製しません。公式写真・映像の貸出も申請対象で、ダウンロード可能を転載許諾と扱いません。"}
};
