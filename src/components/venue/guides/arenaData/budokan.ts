import { budokanGuide } from "@/data/venueGuides/budokan";
import { budokanAreas, budokanFacilityConfig, budokanLevels, budokanStandSeats } from "@/data/venueGuides/budokan/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:budokanGuide,seats:budokanStandSeats,levels:budokanLevels,areas:budokanAreas,facilities:budokanFacilityConfig,
    seatNote:"スタンドは方角・階と列・番号で探せます。アリーナ・使用席は公演ごとの配置です。",
    facilityNote:"1F・2Fのトイレや売店を探せます。男女の割り当て・設備の開放は当日の案内をご確認ください。",
    access:[["九段下駅","東京メトロ東西線・半蔵門線／都営新宿線・2番出口","徒歩5分"],["竹橋駅","東京メトロ東西線／1番出口","徒歩12分"]],
    luggage:"館内にコインロッカーはありません。九段下駅の改札内・改札外、6番出口付近と竹橋駅のロッカーを探せます。",
    preparationTitle:"入場前の過ごし方",preparation:"中道場棟や北の丸公園のトイレ、敷地内の飲食店を設備欄で探せます。公園内は全面禁煙です。",
    accessUrl:"https://www.nipponbudokan.or.jp/about/access",eventsUrl:"https://www.nipponbudokan.or.jp/",
    faq:[["1階・2階の席を探せますか？","階・方角のボタンから拡大してブロックを選べます。列・番号や「1階南」でも検索できます。参考配置のため、主催者の座席案内もご確認ください。"],["館内にロッカーはありますか？","館内にコインロッカーはありません。駅のロッカーを設備欄の「場外・入場前」「荷物」から探せます。改札内には乗車券が必要です。"],["授乳室はありますか？","本館1F南側にあります。利用方法は会場係員へお尋ねください。"],["九段下駅が混んでいる場合は？","竹橋駅1番出口から徒歩12分です。九段下駅では混雑時に4番・1番・3番出口も案内されています。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"budokan",data,};
export default definition;
