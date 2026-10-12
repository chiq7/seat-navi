import { koshienGuide } from "@/data/venueGuides/koshien";
import { koshienSeats, koshienLevels, koshienAreas, koshienFacilityConfig } from "@/data/venueGuides/koshien/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:koshienGuide,seats:koshienSeats,levels:koshienLevels,areas:koshienAreas,facilities:koshienFacilityConfig,
    seatNote:koshienGuide.seatNote,facilityNote:"内野・アルプスと外野の各階、敷地・駅・甲子園プラス・梅田の店舗を切り替えます。点は参考区域です。公演時の開放・営業は当日案内を確認してください。",
    access:[["甲子園駅","阪神本線・西口/東口","駅前広場から球場外周へ"]],
    luggage:"球場内にはロッカー・手荷物預かりがありません。甲子園駅、甲子園プラス2階、大阪梅田駅、梅田の予約預かり店舗を場所一覧から探せます。",
    preparationTitle:"入場前に預け先と回収時刻を確認",preparation:"甲子園プラスのロッカーは歴史館営業中のみ利用でき、営業時間外・休館日は取り出せません。公式FAQは球場の再入場不可を案内しています。公演独自の運用は主催者へ確認してください。",
    accessUrl:"https://koshien.hanshin.co.jp/access/",eventsUrl:"https://koshien.hanshin.co.jp/",
    faq:[["列・番号で探せますか？","確認できた内野・アルプス・外野の列別番号範囲を検索できます。A列・15段などの表記にも対応。他の列・番号と特殊席は確認中です。アイビー、ブリーズなどの名称や地図からも探せます。"],["球場で荷物を預けられますか？","公式FAQは球場内ロッカー・手荷物預かりなしと案内しています。入場前に駅・甲子園プラス・梅田の店舗を確認してください。"],["公演アリーナはこの図ですか？","常設スタンドの参考図です。アリーナ・ステージ・使用席は公演ごとに異なります。"],["歴史館のロッカーは夜も使えますか？","歴史館の営業時間外や休館日は取り出せません。当日の営業時間と回収時刻を利用前に確認してください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"koshien",data,};
export default definition;
