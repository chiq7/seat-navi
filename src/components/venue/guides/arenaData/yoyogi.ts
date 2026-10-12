import { yoyogiGuide } from "@/data/venueGuides/yoyogi";
import { yoyogiAreas, yoyogiFacilityConfig, yoyogiLevels, yoyogiStandSeats } from "@/data/venueGuides/yoyogi/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:yoyogiGuide,seats:yoyogiStandSeats,levels:yoyogiLevels,areas:yoyogiAreas,facilities:yoyogiFacilityConfig,
    seatNote:"スタンドは北1A・南2Lなどの区画名と列・番号で探せます。アリーナは公演ごとの配置です。",
    facilityNote:"設備のB1F・1F・2Fはチケットの階とは別です。場所が分からないAEDなどは「階未確認」から確認できます。",
    access:[["原宿駅","JR山手線","徒歩5分"],["明治神宮前駅","東京メトロ千代田線・副都心線","徒歩5分"],["代々木公園駅","東京メトロ千代田線","徒歩10分"],["渋谷駅","JRほか各線","徒歩15分"]],
    luggage:"館内にコインロッカーはありません。原宿・明治神宮前・代々木公園・渋谷駅のロッカーと、原宿の予約できる店舗預かりを探せます。",
    preparationTitle:"入口と館内の移動",preparation:"通常の出入口は原宿口です。館内にエレベーター・エスカレーターはありません。車いすでの来場は公演主催者の案内をご確認ください。",
    accessUrl:"https://www.jpnsport.go.jp/yoyogi/access/tabid/88/Default.aspx",eventsUrl:"https://www.jpnsport.go.jp/yoyogi/event/tabid/58/Default.aspx",
    faq:[["ブロック名の読み方は？","北1Aは北側1階Aブロックです。北・南それぞれの1階/2階にA・B・C・D・E・F・G・H・J・K・Lがあり、Iはありません。"],["館内に荷物を預けられますか？","館内にコインロッカーはありません。入場前に駅のロッカーをご利用ください。"],["授乳室はどこですか？","B1F北ロビーの東側・西側にあります。女性専用で、手洗い・おむつ交換台・ベビーチェアがあります。"],["車いすで入れますか？","館外に地下2階〜地下1階、地下1階〜地上1階のエレベーターがあります。観覧位置と入口は公演主催者の指定をご確認ください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"yoyogi",data,};
export default definition;
