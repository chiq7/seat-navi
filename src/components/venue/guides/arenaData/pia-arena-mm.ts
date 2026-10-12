import { piaArenaMmGuide } from "@/data/venueGuides/pia-arena-mm";
import { piaAreas, piaFacilityConfig, piaLevels, piaStandSeats } from "@/data/venueGuides/pia-arena-mm/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: piaArenaMmGuide, seats: piaStandSeats, levels: piaLevels, areas: piaAreas, facilities: piaFacilityConfig,
    seatNote: "2〜4Fは階・列・番号で探せます。L・C・R側と地図からも選べます。1Fアリーナ・使用席は公演ごとの配置です。",
    access: [["みなとみらい駅", "みなとみらい線／1番出口", "徒歩7分"], ["新高島駅", "みなとみらい線／2番出口", "徒歩8分"], ["桜木町駅", "JR京浜東北・根岸線／北改札・東口", "徒歩7分"], ["横浜駅", "JRほか／東口", "徒歩18分"]],
    luggage: "館内1F、みなとみらい・新高島・桜木町・横浜駅のロッカーと、近隣の予約ロッカー・店舗預かりを探せます。館内の入場前利用は公演案内をご確認ください。",
    preparationTitle: "小銭と座席の確認", preparation: "館内ロッカーは普通400円・大型700円・特大800円。3・4Fの最前列は立って観覧できません。",
    accessUrl: "https://pia-arena-mm.jp/access/index.html", eventsUrl: "https://pia-arena-mm.jp/",
    faq: [["L01などは列番号ですか？", "出入口の識別子で、列とは別です。番号欄に2FL01など階を含めると出入口付近を探せます。L・C・R側は上のボタンで選べます。"], ["列・番号で探せますか？", "2〜4Fは階・列・番号で探せます。地図の開始番号は基準列の目印で、全列共通の端番号ではありません。立見や車いす席、使用する席は公演案内をご確認ください。"], ["開場前にトイレを使えますか？", "2Fの館外多目的トイレは開場前に利用できます。設備欄の「場外・入場前」から探せます。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"pia-arena-mm",data,};
export default definition;
