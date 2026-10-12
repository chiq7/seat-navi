import { paypayDomeGuide } from "@/data/venueGuides/paypay-dome";
import { paypayAreas, paypayFacilityConfig, paypayLevels, paypayStandSeats } from "@/data/venueGuides/paypay-dome/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: paypayDomeGuide, seats: paypayStandSeats, levels: paypayLevels, areas: paypayAreas, facilities: paypayFacilityConfig,
    seatNote: paypayDomeGuide.seatNote,
    facilityNote: "館内1〜6F、デッキ・外周、唐人町駅、博多駅、ドーム外の店舗を切り替えて探せます。4〜6Fは券種による利用範囲をご確認ください。",
    access: [["唐人町駅", "福岡市地下鉄 空港線／3番出口", "徒歩約15分"]],
    luggage: "デッキ・外周のロッカー、唐人町駅・博多駅のロッカーとCrosta博多の有人預かりを探せます。会場のコインロッカー以外での荷物預かりはありません。",
    preparationTitle: "終演後に取り出せる場所を選ぶ", preparation: "Crosta博多は20時まで。会場ロッカーは0時を跨ぐと2日利用扱いです。料金と決済方法は2026年7月16日に変更されているため、個別案内をご確認ください。",
    accessUrl: "https://www.softbankhawks.co.jp/stadium/access.html", eventsUrl: "https://www.softbankhawks.co.jp/stadium/event_schedule.html",
    faq: [["列・番号で探せますか？", paypayDomeGuide.seatNote], ["ロッカーはどこですか？", "会場はデッキと外周の掲載点、キャッシュレス機は4・6・7ゲートの案内を確認できます。唐人町駅・博多駅のロッカーも設備欄から探せます。"], ["公演のアリーナ配置も同じですか？", "アリーナ・ステージ・使用する席は公演によって変わります。この図は常設席の参考範囲です。"], ["3番出口は段差なしで行けますか？", "徒歩約15分という公式目安とは別です。エレベーターの出口と当日の入場先は駅・主催者の案内をご確認ください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"paypay-dome",data,};
export default definition;
