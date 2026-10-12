import { edionGuide, makeEdionGuide, edionClosureNote } from "@/data/venueGuides/edion-arena";
import { edionSeats, edionLevels, edionAreas, edionFacilityConfig, makeEdionFacilityConfig, type EdionMode } from "@/data/venueGuides/edion-arena/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: edionGuide, seats: edionSeats.first, levels: edionLevels("first"), areas: edionAreas("first"), facilities: edionFacilityConfig,
    seatNote: edionGuide.seatNote, facilityNote: "全館休館中です。館内は改修前の参考図です。駅・店舗の荷物は場外の一覧から探せます。",
    access: [["地下鉄なんば駅", "5番出口", "350m"], ["南海なんば駅", "南出口", "250m"], ["大阪難波駅", "近鉄・阪神", "600m"], ["JRなんば駅", "JR・OCAT", "800m"]],
    luggage: "一般観客用の館内預かりは確認中です。競技者用ロッカー室は別用途です。南海・地下鉄・OCATと難波の店舗預かりを一覧から探せます。",
    preparationTitle: "全館休館と取り出し時間を確認", preparation: "2027年1月まで全館休館中です。再開日・再開後の配置は公式案内を確認してください。駅ロッカーは区域によって営業時間が異なり、トラベルハブの受け取りは18:30までです。",
    accessUrl: "https://www.furitutaiikukaikan.ne.jp/access.php", eventsUrl: "https://www.furitutaiikukaikan.ne.jp/",
    faq: [["現在、会場を利用できますか？", "2027年1月まで全館休館と公式に案内されています。工期・再開日は予定で、2027年2・3月の予約受付を再開済みとは扱いません。"], ["第1競技場の列・番号で探せますか？", edionGuide.seatNote], ["第2競技場も同じ座席図ですか？", "第2競技場はB2Fの別会場です。ボタンで切り替え、席・リング・ステージの配置は主催者案内を確認してください。"], ["大きな荷物は預けられますか？", "館内の競技者用ロッカー室は一般観客の預かりではありません。難波の駅ロッカーと有人預かりの料金・取り出し時間を設備欄から確認できます。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"edion-arena",data,initialMode:"first", modes:{"ariaLabel":"競技場","caption":"会場","options":[{"id":"first","label":"第1競技場・固定席"},{"id":"second","label":"第2競技場"}]},
resolveMode(mode){const selected:EdionMode=mode==="second"?"second":"first";const guide=makeEdionGuide(selected);return {guide,seats:edionSeats[selected],levels:edionLevels(selected),areas:edionAreas(selected),facilities:makeEdionFacilityConfig(selected),seatNote:guide.seatNote};},
closureNote:edionClosureNote,
};
export default definition;
