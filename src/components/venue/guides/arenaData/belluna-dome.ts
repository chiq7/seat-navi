import { bellunaDomeGuide } from "@/data/venueGuides/belluna-dome";
import { bellunaSeats, bellunaLevels, bellunaAreas, bellunaFacilityConfig } from "@/data/venueGuides/belluna-dome/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:bellunaDomeGuide,seats:bellunaSeats,levels:bellunaLevels,areas:bellunaAreas,facilities:bellunaFacilityConfig,
    seatNote:bellunaDomeGuide.seatNote,facilityNote:"座席図と設備図は向きが異なります。場内と獅子ビル・センタービル・専用ラウンジ、敷地・駅・予約預かりを分けて探せます。",
    access:[["西武球場前駅","西武狭山線・山口線","駅から敷地へ"]],
    luggage:"ドーム内にロッカーはありません。西武球場前・西所沢・所沢の改札内ロッカーと、所沢の予約預かり店舗を設備の場所一覧から探せます。",
    preparationTitle:"改札内と取り出し時間を確認",preparation:"最寄りのSPACERは西武球場前駅の改札内・トイレ入口左です。所沢駅南改札のSPACERは23時まで、ほかの掲載3か所は23:59まで。改札内の利用には乗車券が必要です。",
    accessUrl:"https://bellunadome.seibulions.co.jp/guide/access.html",eventsUrl:"https://bellunadome.seibulions.co.jp/",
    faq:[["列・番号で探せますか？",bellunaDomeGuide.seatNote],["荷物は会場で預けられますか？","公式FAQはドーム内ロッカーなしと案内しています。掲載した駅ロッカーは改札内、店舗預かりは事前予約が必要です。"],["公演アリーナはこの図ですか？","この図は2026の常設席です。アリーナ・ステージ・使用席は公演ごとに異なります。"],["設備は全部使えますか？","ラウンジ・スイートなどの専用区域、別棟・場内店舗の開放や営業は開催日と券種によります。図は室入口や歩行経路ではなく掲載区域を示します。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"belluna-dome",data,};
export default definition;
