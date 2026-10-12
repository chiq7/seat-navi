import { osakaJoHallGuide } from "@/data/venueGuides/osaka-jo-hall";
import { makeOsakaFacilityConfig, osakaAreas, osakaLevels, osakaStandSeats } from "@/data/venueGuides/osaka-jo-hall/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const osakaFacilityConfig = makeOsakaFacilityConfig(osakaJoHallGuide);
const data: ArenaVenueData = {
    guide: osakaJoHallGuide, seats: osakaStandSeats, levels: osakaLevels, areas: osakaAreas, facilities: osakaFacilityConfig,
    seatNote: "アリーナ席とステージは公演ごとの配置です。使用するスタンドも公演案内をご確認ください。",
    access: [["大阪城公園駅", "JR大阪環状線", "徒歩5分"], ["大阪ビジネスパーク駅", "Osaka Metro 長堀鶴見緑地線／4番出口", "徒歩5分"], ["森ノ宮駅", "JR大阪環状線・Osaka Metro", "徒歩15分"]],
    luggage: "館内に小・中・大のロッカーがあります。入場前は大阪城公園駅・大阪ビジネスパーク駅も確認できます。",
    preparationTitle: "ロッカーの支払い", preparation: "館内ロッカーは100円硬貨のみ。会場に両替機はないため、小銭を用意しておくと便利です。",
    accessUrl: "https://www.osaka-johall.com/access/", eventsUrl: "https://www.osaka-johall.com/event/",
    faq: [["同じ列・番号がいくつも出るのはなぜ？", "A〜Nでは番号が繰り返されます。場所ボタンで絞るか、候補からチケットのブロックを選んでください。番号欄にAなどのブロック名も入力できます。"], ["BOX席も探せますか？", "BOX席の1〜3列を案内しています。BOX席ボタンから地図をタップするか、列・番号を入力して探せます。"], ["駅から段差なしで行けますか？", "公式の大阪城公園駅・大阪ビジネスパーク駅からの道順には階段があります。車いすなどで来場する場合は主催者にご確認ください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"osaka-jo-hall",data,};
export default definition;
