import { mufgGuide } from "@/data/venueGuides/mufg-stadium";
import { mufgSeats, mufgLevels, mufgAreas, mufgFacilityConfig } from "@/data/venueGuides/mufg-stadium/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:mufgGuide,seats:mufgSeats,levels:mufgLevels,areas:mufgAreas,facilities:mufgFacilityConfig,
    seatNote:mufgGuide.seatNote,facilityNote:"1層は1F、2層は2F、3層は4F。3Fコンコースは改修中です。設備の点は参考区域で、公演当日の開放・店舗営業を確認してください。",
    access:[["国立競技場駅","都営大江戸線・A2出口","徒歩1分"],["千駄ケ谷駅","JR総武線各駅停車","徒歩5分"],["信濃町駅","JR総武線各駅停車","徒歩5分"],["外苑前駅","東京メトロ銀座線・3番出口","徒歩9分"]],
    luggage:"最寄り3駅のロッカー、新宿駅のロッカーと新宿西口の予約預かり店舗を場所一覧から探せます。会場内・敷地の一般荷物預かりは確認中です。",
    preparationTitle:"入場前に預け先と回収時間を確認",preparation:"国立競技場駅の掲載3区域は改札外です。JR千駄ケ谷・信濃町は個別位置・利用条件を現地表示で確認してください。予約店舗は新宿にあり、会場最寄りではありません。",
    accessUrl:"https://jns-e.com/access/",eventsUrl:"https://jns-e.com/",
    faq:[["列・番号で探せますか？","印字を確認できた一部の列は番号で探せます。他の列は確認中です。101ブロックなどの名称や地図からも探せます。"],["館内で荷物を預けられますか？","一般ロッカー・手荷物預かりは確認中です。入場前に駅や予約店舗の利用条件を確認してください。"],["3層の設備は3Fですか？","3層スタンドの設備図は4Fです。3Fコンコースは現在改修工事で利用できないと公式に案内されています。"],["空の杜はいつ使えますか？","5Fの展望ウォークです。10〜16時、最終入場15:50。イベント等で閉鎖するため、来場日の公式案内を確認してください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"mufg-stadium",data,};
export default definition;
