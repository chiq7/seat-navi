import { zozoMarineGuide } from "@/data/venueGuides/zozo-marine";
import { zozoSeats, zozoLevels, zozoAreas, zozoFacilityConfig } from "@/data/venueGuides/zozo-marine/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:zozoMarineGuide,seats:zozoSeats,levels:zozoLevels,areas:zozoAreas,facilities:zozoFacilityConfig,
    seatNote:zozoMarineGuide.seatNote,facilityNote:"場内1〜4Fと敷地・駅・店舗を切り替えます。点は参考区域です。営業・入場・公演時の開放は当日案内を確認してください。",
    access:[["海浜幕張駅","JR京葉線・南口","徒歩約15分"]],
    luggage:"場内209通路、外周チケット窓口、ベビーカーゾーンのロッカー、海浜幕張駅改札外3か所、東京駅と予約預かり店舗を探せます。",
    preparationTitle:"球場ロッカーは事前払い・24時間単位",preparation:"2026年6月19日からSPACERの利用方式が変更。場内ロッカーは入場後の営業時間内に利用します。取り出し時間・サイズと当日の敷地立入条件も確認してください。",
    accessUrl:"https://www.marines.co.jp/stadium/access/",eventsUrl:"https://www.marines.co.jp/",
    faq:[["列・番号で探せますか？","上段1塁側46列168番、上段3塁側48列269番などの確認済み番号と、下段15列261番・外野1列301番などの一部開始番号を検索できます。他の番号は確認中です。下段・上段・外野は地図からも選べます。"],["入場前に荷物を預けられますか？","外周ロッカー、海浜幕張駅改札外の3か所と予約店舗を場所一覧から探せます。利用・取り出し条件を個別案内で確認してください。"],["公演アリーナはこの図ですか？","常設スタンドの参考図です。アリーナ・ステージ・使用席は公演ごとに異なります。"],["ベビーカー預かりは荷物も対応しますか？","一般荷物とは別の野球開催日向けサービスです。公演時の運用は当日案内を確認してください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"zozo-marine",data,};
export default definition;
