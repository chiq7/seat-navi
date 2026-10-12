import { miyagiGuide, miyagiNotice } from "@/data/venueGuides/miyagi-arena";
import { miyagiSeats, miyagiLevels, miyagiAreas, miyagiFacilityConfig } from "@/data/venueGuides/miyagi-arena/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: miyagiGuide, seats: miyagiSeats, levels: miyagiLevels, areas: miyagiAreas, facilities: miyagiFacilityConfig,
    seatNote: miyagiGuide.seatNote, facilityNote: "メインとサブは別の棟です。トイレは棟・階を選び、仙台駅の荷物は場外の一覧から探せます。",
    access: [["JR利府駅", "菅谷台経由・青葉台経由 → 菅谷台四丁目", "バス約10分"], ["JR利府駅", "会場まで約3km", "徒歩45分"], ["JR岩切駅", "会場まで約4km", "徒歩60分"]],
    officialRouteUrl: "https://www.mspf.jp/grande21/index.php?action=sisetu_traffic_index", routeLabel: "公式の交通案内 ↗",
    accessNote: "バス・徒歩時間は公式の目安です。3丁目はスタジアム側、アリーナは4丁目です。公演のシャトル・運行時間と使用入口は主催者案内を確認してください。",
    luggage: "サブアリーナ1Fロビー等にコインロッカーがあります。メインの観客利用条件は確認中。入場前の大きな荷物は、仙台駅11区域のロッカーと3Fの有人預かりも確認できます。",
    preparationTitle: "帰りのバスと荷物の受け取り", preparation: `${miyagiNotice} 仙台駅の有人預かりは19:00まで。ロッカーは区域により始発〜終電、6〜24時など条件が異なります。`,
    accessUrl: "https://www.mspf.jp/grande21/index.php?action=sisetu_traffic_index", eventsUrl: "https://www.mspf.jp/grande21/",
    faq: [["メインとサブの設備は共通ですか？", "別の棟です。ロッカーはサブ1Fロビー等、喫茶店はサブ2Fです。チケットに記載された会場と、設備の棟・階を確認してください。"], ["会場で食事できますか？", "メインの観客席では飲食できません。ロビー・コンコースでの飲食は催しの条件に従ってください。売店はなく、サブ2Fに喫茶店があります。"], ["すべての列・番号を検索できますか？", miyagiGuide.seatNote], ["会場へ荷物を発送できますか？", "施設では宅配便の受け取り・発送を受け付けていません。主催者の対応を確認してください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"miyagi-arena",data,};
export default definition;
