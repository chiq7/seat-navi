import { ariakeArenaGuide } from "@/data/venueGuides/ariake-arena";
import { ariakeAreas, ariakeFacilityConfig, ariakeLevels, ariakeStandSeats } from "@/data/venueGuides/ariake-arena/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: ariakeArenaGuide, seats: ariakeStandSeats, levels: ariakeLevels, areas: ariakeAreas, facilities: ariakeFacilityConfig,
    seatNote: "常設スタンドの参考図です。A〜Hを選び、列・番号でも探せます。使用席・可動席・アリーナは公演案内をご確認ください。",
    access: [["新豊洲駅", "ゆりかもめ", "徒歩8分"], ["有明テニスの森駅", "ゆりかもめ", "徒歩8分"], ["国際展示場駅", "りんかい線", "徒歩17分"], ["東雲駅", "りんかい線", "徒歩17分"]],
    luggage: "館内2F、近くの４駅、有明ガーデン４か所のロッカーを探せます。新豊洲駅と東雲駅は改札内外の違いにもご注意ください。",
    preparationTitle: "ロッカーと来場ルート", preparation: "館内ロッカーは大700円・中500円・小400円。現金（紙幣は1,000円札のみ）・交通系ICに対応し、両替機はありません。来場と帰りは公式指定ルートが異なります。",
    accessUrl: "https://ariake-arena.tokyo/access/", eventsUrl: "https://ariake-arena.tokyo/", officialRouteUrl: "https://ariake-arena.tokyo/access/",
    faq: [["列・番号で探せますか？", "A〜Hを選び、チケットの列・番号を入力してください。番号欄にB41のように区画を付けても探せます。車いす席など公演によって変わる席は主催者の図をご確認ください。"], ["ロッカーはどこにありますか？", "館内は2F北側メインエントランスに91個、南側ルームに54個あります。入場前は駅や有明ガーデンのロッカーを設備欄から探せます。"], ["車で来場できますか？", "メインアリーナの公演来場者向け駐車場・車寄せはありません。公共交通をご利用ください。"], ["座席の階と設備は？", "A〜Dは2F、E・Gは3F、F・Hは4F・5F席の案内です。設備は階を選んで探してください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"ariake-arena",data,};
export default definition;
