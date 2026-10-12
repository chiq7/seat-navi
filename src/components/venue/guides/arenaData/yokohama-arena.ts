import { yokohamaArenaGuide } from "@/data/venueGuides/yokohama-arena";
import { yokohamaAreas, yokohamaFacilityConfig, yokohamaLevels, yokohamaStandSeats } from "@/data/venueGuides/yokohama-arena/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: yokohamaArenaGuide, seats: yokohamaStandSeats, levels: yokohamaLevels, areas: yokohamaAreas, facilities: yokohamaFacilityConfig,
    seatNote: "センター席は公演ごとの配置です。使用するブロック・ステージは公演案内をご確認ください。",
    access: [["新横浜駅", "JR横浜線／北口", "徒歩5分"], ["新横浜駅", "東海道新幹線／東口", "徒歩5分"], ["新横浜駅", "地下鉄・相鉄・東急／出口7・8", "徒歩4分"]],
    luggage: "館内ロッカーのほか、新横浜駅の大型ロッカーやStudio MUGICの預かりも探せます。",
    preparationTitle: "飲食・休憩", preparation: "客席での食事はできません。食事はロビーで。ペットボトルなどの水分補給は客席でもできます。",
    accessUrl: "https://www.yokohama-arena.co.jp/access/", eventsUrl: "https://www.yokohama-arena.co.jp/event/",
    faq: [["アリーナ席とセンター席は違いますか？", "アリーナ席はA〜Fの階段状の席です。センター席は中央の平らなフロアで、公演によって配置が変わります。"], ["A12と書かれた場所は何ですか？", "Aブロックの12列を示します。列欄にA12などの区画と列、番号欄に席番号を入力します。確認済みの列は検索できます。A・Dの12列、B・C・E・Fの11列は検索準備中なので、区画名や地図からお探しください。"], ["車いすで来場する場合は？", "車いす席とエレベーターの利用は主催者係員にご確認ください。多目的トイレは1F・2Fにあります。会場で車いすの貸し出しは行っていません。"], ["ベビーカーやスーツケースを預けられますか？", "会場によるベビーカー・スーツケースの預かりサービスはありません。公演主催者の対応は公演案内をご確認ください。荷物は館内・駅のロッカーや店舗預かりを探せます。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"yokohama-arena",data,};
export default definition;
