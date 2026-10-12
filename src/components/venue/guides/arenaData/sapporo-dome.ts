import { sapporoDomeGuide, makeSapporoGuide } from "@/data/venueGuides/sapporo-dome";
import { sapporoSeats, sapporoLevels, sapporoAreas, sapporoFacilityConfig, type SapporoMode } from "@/data/venueGuides/sapporo-dome/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:sapporoDomeGuide,seats:sapporoSeats.baseball,levels:sapporoLevels,areas:sapporoAreas,facilities:sapporoFacilityConfig,
    seatNote:sapporoDomeGuide.seatNote,facilityNote:"館内の各階、敷地・入場前、福住駅、札幌・さっぽろ駅と街の店舗を切り替えます。地下2階は関係者、4階は券種による専用区域です。",
    access:[["福住駅","地下鉄東豊線／3番出口","徒歩約10分"]],
    luggage:"入場後の館内5区域、入場前2区域のロッカー、福住・さっぽろ・JR札幌のロッカーとヤマト3店舗の有人預かりを探せます。",
    preparationTitle:"取り出し時間と100円硬貨",preparation:"会場ロッカーは当日限り、100円硬貨のみ。料金のほかに返却される預り金100円が必要です。総合案内は営業日の17時、館内はイベント終了までに取り出してください。",
    accessUrl:"https://www.sapporo-dome.co.jp/access/subway/",eventsUrl:"https://www.sapporo-dome.co.jp/schedule/",
    faq:[["野球とサッカーで同じ図ですか？","配置が異なるためモードを切り替えてください。公演アリーナや使用席は主催者案内で確認してください。"],["列・番号で探せますか？",sapporoDomeGuide.seatNote],["入場前に荷物を預けられますか？","総合案内と館外・北のロッカーは入場前の区域です。営業日と開門時間を確認してください。駅・ヤマトの預かりも設備の場所一覧から確認できます。"],["設備図の北は上ですか？","フロア図は北が左・東が上です。敷地図は別の向きで、通路・入口中心・段差なし経路は未確定です。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"sapporo-dome",data,initialMode:"baseball", modes:{"ariaLabel":"公式座席モード","caption":"座席図","options":[{"id":"baseball","label":"野球・コンサートモード"},{"id":"soccer","label":"サッカーモード"}]},
resolveMode(mode){const selected:SapporoMode=mode==="soccer"?"soccer":"baseball";const guide=makeSapporoGuide(selected);return {guide,seats:sapporoSeats[selected],levels:data.levels,areas:data.areas,facilities:data.facilities,seatNote:guide.seatNote};},
};
export default definition;
