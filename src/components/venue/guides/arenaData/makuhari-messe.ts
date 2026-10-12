import { makuhariGuide, makeMakuhariGuide } from "@/data/venueGuides/makuhari-messe";
import { makuhariSeats, makuhariLevels, makuhariAreas, makuhariFacilityConfig, type MakuhariMode } from "@/data/venueGuides/makuhari-messe/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: makuhariGuide, seats: makuhariSeats.event, levels: makuhariLevels("event"), areas: makuhariAreas("event"), facilities: makuhariFacilityConfig(),
    seatNote: makuhariGuide.seatNote, facilityNote: "イベントホール・展示場・国際会議場は棟と階を選んでください。ロッカーは棟によって大きさ・料金・利用対象が異なります。",
    access: [["海浜幕張駅", "JR京葉線／南口", "徒歩約5分"], ["幕張豊砂駅", "JR京葉線", "徒歩約20分"], ["幕張本郷駅", "JR総武線・京成線／バス乗り場1", "バス約17分"]],
    luggage: "展示場・イベントホール・屋外、海浜幕張駅とプレナ・アウトレット・スークのロッカーを探せます。イベントホールの小型は来場者限定です。終演後の取り出し時刻も確認してください。",
    preparationTitle: "公演の棟と入場口を確認", preparation: "イベントホールと展示ホールは別の棟です。展示ホールや可動席・アリーナの配置は公演ごとに異なります。チケットの会場名と主催者の入場口案内を確認してください。",
    accessUrl: "https://www.m-messe.co.jp/access/", eventsUrl: "https://www.m-messe.co.jp/event/",
    faq: [["B1などで座席を探せますか？", makuhariGuide.seatNote], ["展示ホールの席番号は？", "公演ごとの配置です。展示ホール1〜11の場所を選び、席とステージは主催者の図を確認してください。"], ["館内ロッカーは何時まで？", "原則8〜20時ですがイベントにより異なります。24時を過ぎると1日分加算、最大3日間。イベントホールの小型は来場者のみ利用できます。"], ["海浜幕張駅からイベントホールまで5分ですか？", "約5分は幕張メッセへの公式目安です。使用する棟と指定入口までの時間は異なります。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"makuhari-messe",data,initialMode:"event", modes:{"ariaLabel":"会場の棟","caption":"会場","options":[{"id":"event","label":"イベントホール"},{"id":"exhibition","label":"展示ホール1〜11"}]},
resolveMode(mode){const selected:MakuhariMode=mode==="exhibition"?"exhibition":"event";const guide=makeMakuhariGuide(selected);return {guide,seats:makuhariSeats[selected],levels:makuhariLevels(selected),areas:makuhariAreas(selected),facilities:makuhariFacilityConfig(selected),seatNote:guide.seatNote};},
};
export default definition;
