import { hiroshimaGuide, hiroshimaNotice } from "@/data/venueGuides/hiroshima-arena";
import { hiroshimaSeats, hiroshimaLevels, hiroshimaAreas, hiroshimaFacilityConfig } from "@/data/venueGuides/hiroshima-arena/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: hiroshimaGuide, seats: hiroshimaSeats, levels: hiroshimaLevels, areas: hiroshimaAreas, facilities: hiroshimaFacilityConfig,
    seatNote: hiroshimaGuide.seatNote, facilityNote: "大アリーナと本館は棟・階を選んでください。本館ロッカーと駅・バスセンターの荷物は一覧から探せます。",
    access: [["県庁前駅", "アストラムライン／西2出口（基町クレド側）", "下車後、会場へ"], ["広島バスセンター・紙屋町", "広島駅からバス", "車内約10分"], ["紙屋町西・原爆ドーム前", "路面電車／広島駅から紙屋町西", "車内約15分"]],
    officialRouteUrl: "https://h-jigyoudan.or.jp/sports-center/center-overview/#access", routeLabel: "公式の交通・駐車場案内 ↗",
    accessNote: "バス・電車の時間は広島駅から下車地点までの目安です。公演の入場口までの徒歩時間ではありません。使用入口と当日の運行は主催者案内を確認してください。",
    luggage: "本館B1の授乳室横に13口のコインロッカーがあります。21時以降は取り出せません。大きな荷物はバスセンターや広島駅北側2FのCrostaも一覧から確認できます。",
    preparationTitle: "終演後の荷物受け取りを確認", preparation: `${hiroshimaNotice} 本館ロッカーは21時まで、Crosta広島は20時まで。バスセンターのロッカーと有人預かりは利用時間が異なります。`,
    accessUrl: "https://h-jigyoudan.or.jp/sports-center/center-overview/", eventsUrl: "https://h-jigyoudan.or.jp/sports-center/",
    faq: [["G14などで座席を探せますか？", hiroshimaGuide.seatNote], ["館内で荷物を預けられますか？", "本館B1授乳室横に小10口300円・中3口400円のロッカーがあります。21時以降は館内に出入りできず、取り出せません。公演の入場境界は係員へ確認してください。"], ["食事を買えますか？", "本館B1に食品自販機があります。常設レストラン・売店はありません。観客席の飲食は可能ですが、公演独自の条件は主催者案内に従ってください。"], ["固定席図にアリーナ席は含まれますか？", "固定スタンドの参考図です。公演アリーナ・可動席・ステージ配置は主催者の図を確認してください。小アリーナとは別会場です。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"hiroshima-arena",data,};
export default definition;
