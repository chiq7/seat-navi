import { tokyoGardenTheaterGuide } from "@/data/venueGuides/tokyo-garden-theater";
import { gardenAreas, gardenFacilityConfig, gardenLevels, gardenStandSeats } from "@/data/venueGuides/tokyo-garden-theater/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: tokyoGardenTheaterGuide, seats: gardenStandSeats, levels: gardenLevels, areas: gardenAreas, facilities: gardenFacilityConfig,
    seatNote: "2Fアリーナは公演ごとの配置です。バルコニーは階・区画と列・番号で探せます。使用する席や車いすエリアは公演案内をご確認ください。",
    access: [["有明駅", "ゆりかもめ／2B出口", "徒歩4分"], ["有明テニスの森駅", "ゆりかもめ／2A出口", "徒歩5分"], ["国際展示場駅", "りんかい線／A出口", "徒歩7分"]],
    facilityNote: "館内2〜5F、入場前のロッカー、近くの店舗・駅・交通設備を探せます。入口は公演によって2Fまたは3Fです。",
    luggage: "館内・ホテル・モール・最寄り3駅のロッカー、新橋・豊洲・大崎で乗換時に預ける場所も探せます。新橋の店舗預かりは予約が必要です。",
    preparationTitle: "シアターの荷物の支払い", preparation: "シアターのロッカーは電子マネー・クレジットカード、バゲッジポートは電子マネーのみ。現金は使えません。駅やモールの条件は設備欄をご確認ください。",
    accessUrl: "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/faq/", eventsUrl: "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/",
    faq: [["車・タクシーで来場できますか？", "有明ガーデンの一般駐車場を利用できますが、公演チケットの駐車割引はありません。ホテル・スパ専用駐車場は対象利用者のみ。タクシーは1Fバスターミナルで手配し、常駐していません。"], ["Wi-Fiはありますか？", "館内の無料Wi-FiはAriake_Garden FreeWifiです。接続画面の案内に従って利用してください。"], ["1Eなどの数字は何ですか？", "最初の数字はバルコニーの階層です。1A〜1Iは3F、2A〜2Iは4F、3A〜3Iは5Fです。番号欄に1Eなどの区画名を入力して探せます。"], ["区画・列・番号でどう探せますか？", "例えば1Aの8列2番なら、列欄に1A8、番号欄に2を入力します。階とA〜Iのボタンを選んで、列と番号を入力しても探せます。開始番号は基準列の目印で、列ごとに異なります。"], ["入場前に荷物を預けられますか？", "ホテル軒下1Fのロッカーは24時間、モール＆スパ棟3Fは公演終了後まで利用できます。有明ガーデンや駅のロッカーも設備欄から探せます。"], ["売店はいつまで営業しますか？", "通常は開場から開演30分後までです。公演によって変わります。4Fは電子マネー・カードを用意し、現金対応は売店ごとにご確認ください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"tokyo-garden-theater",data,};
export default definition;
