import { gaishiHallGuide, makeGaishiGuide } from "@/data/venueGuides/gaishi-hall";
import { gaishiAreas, gaishiFacilityConfig, gaishiLevels, gaishiSeats, gaishiStandSeats, type GaishiMode } from "@/data/venueGuides/gaishi-hall/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: gaishiHallGuide, seats: gaishiStandSeats, levels: gaishiLevels("fixed"), areas: gaishiAreas, facilities: gaishiFacilityConfig,
    seatNote: "チケットや主催者の図に合わせて、ブリージャー席の有無を選んでください。アリーナ・使用席は公演ごとの配置です。",
    facilityNote: "館内は1F・2F。共用設備と駅の荷物は「場外・入場前」から探せます。当日の開放区域は公演案内をご確認ください。",
    access: [["笠寺駅", "JR東海道本線", "徒歩3分"], ["本笠寺駅", "名鉄名古屋本線", "徒歩15分"], ["大江駅", "名鉄常滑線", "徒歩15分"]],
    luggage: "館内1Fロビー中央のロッカーと、金山・名古屋の駅ロッカー、名古屋の店舗預かりを探せます。",
    preparationTitle: "大会期間中の利用", preparation: "大会に伴い、ホールの一般利用は2026年8月6日〜11月30日まで休止予定です。大会への来場は主催者の入口・交通案内をご確認ください。",
    accessUrl: "https://www.nespa.or.jp/sports-plaza/hall/access/", eventsUrl: "https://www.nespa.or.jp/sports-plaza/hall/",
    faq: [["日本ガイシホールとは別の会場ですか？", "同じホールです。現在の名称はクロコくんホールです。別施設のクロコくんアリーナとは区別してください。"], ["Sは入口の名前ですか？", "公式観客席図の区画名です。A〜PとSを表示しています。指定入口はチケットや主催者案内をご確認ください。"], ["Eの列で検索できません", "公式図にE区画の列名が載っていないため、列を空欄にしてEと番号で探すか、地図のブロックを選んでください。"], ["館内のロッカーはどこですか？", "1Fロビー中央です。大は1日1回500円、小は200円。収納サイズは設備欄の荷物から確認できます。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"gaishi-hall",data,initialMode:"fixed", modes:{"ariaLabel":"公式座席図のパターン","caption":"座席図","options":[{"id":"fixed","label":"ブリージャー席なし"},{"id":"bleacher","label":"ブリージャー席あり"}]},
resolveMode(mode){const selected:GaishiMode=mode==="bleacher"?"bleacher":"fixed";const guide=makeGaishiGuide(selected);return {guide,seats:gaishiSeats[selected],levels:gaishiLevels(selected),areas:data.areas,facilities:data.facilities,seatNote:data.seatNote};},
};
export default definition;
