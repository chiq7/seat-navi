import { vantelinDomeGuide } from "@/data/venueGuides/vantelin-dome";
import { vantelinAreas, vantelinFacilityConfig, vantelinLevels, vantelinStandSeats, vantelinPrimeSeats, vantelinPrimeLevels, vantelinPrimeAreas } from "@/data/venueGuides/vantelin-dome/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: vantelinDomeGuide, seats: vantelinStandSeats, levels: vantelinLevels, areas: vantelinAreas, facilities: vantelinFacilityConfig,
    seatNote: vantelinDomeGuide.seatNote,
    facilityNote: "館内2〜5Fの設備と、場外のゲート・周辺モール・駅を切り替えて探せます。図に載せていない設備も場所一覧から選べます。",
    access: [["ナゴヤドーム前矢田駅", "地下鉄名城線・ゆとりーとライン／地下鉄1番出口", "徒歩5分"], ["大曽根駅", "JR中央本線・名鉄瀬戸線", "徒歩15分"]],
    luggage: "館内2Fのロッカー5区域、近隣モールの無料ロッカー6区域、乗換駅のJR名古屋12区域と周辺3件を探せます。タカシマヤ有人預かりは20時まで。最寄り矢田・大曽根の個別ロッカー位置は確認中です。会場による有人預かりはありません。",
    preparationTitle: "ロッカーの支払いと取り出し", preparation: "館内は小300円・中500円・大600円。100円硬貨のみで、イベント終了までに取り出してください。38通路前には大型がありません。公演により利用できない場合があります。",
    accessUrl: "https://www.nagoya-dome.co.jp/enjoy/access.php", eventsUrl: "https://www.nagoya-dome.co.jp/",
    faq: [["列・番号で探せますか？", "下段・上段・パノラマの確認済み範囲を、列とL1・R21などの番号で探せます。番号だけなら左右や階層の候補を表示します。未対応の列・番号は確認中の案内になります。公演による使用席は主催者の案内をご確認ください。"], ["館内ロッカーはどこですか？", "2Fの19〜20・25〜26・39〜40・45〜46通路間、38通路前の5か所です。設備欄の荷物から探せます。"], ["授乳スペースは誰でも使えますか？", "2F17通路前の施錠できる個室は性別を問わず利用できます。他3か所の授乳スペースは女性専用。おむつ交換は男女とも利用できます。"], ["駅の1番出口から段差なしで行けますか？", "徒歩5分の目安と段差なし経路は別です。利用する駅出口・会場入口は主催者や駅の案内をご確認ください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"vantelin-dome",data,initialMode:'fixed',primeMode:'prime',preserveFacilitiesAcrossModes:true,modes:{ariaLabel:'座席図の種類',caption:'座席図',options:[{id:'fixed',label:'スタンド・ウイング'},{id:'prime',label:'プライムの展開図'}]},resolveMode(mode){const prime=mode==='prime';return {guide:data.guide,seats:prime?vantelinPrimeSeats:data.seats,levels:prime?vantelinPrimeLevels:data.levels,areas:prime?vantelinPrimeAreas:data.areas,facilities:data.facilities,seatNote:prime?"番号図は円周に沿う座席を開いた展開図です。ツインは列とL/R番号、ボックスは番号、レストランはF/H番号で探せます。ツインの番号は2名セット、ボックスとHは4名セットです。Fは個別番号で2名セットの組み合わせは未確定。車いす記号付きの一部番号と券種A/Bの境界は保留しています。":data.seatNote};},
};
export default definition;
