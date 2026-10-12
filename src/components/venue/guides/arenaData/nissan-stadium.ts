import { nissanGuide } from "@/data/venueGuides/nissan-stadium";
import { nissanSeats, nissanLevels, nissanAreas, nissanFacilityConfig } from "@/data/venueGuides/nissan-stadium/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: nissanGuide, seats: nissanSeats, levels: nissanLevels, areas: nissanAreas, facilities: nissanFacilityConfig,
    seatNote: nissanGuide.seatNote, facilityNote: "1階席の設備は4・5F、2階席は6・7Fです。図にない設備や駅の荷物も一覧から探せます。",
    access: [["新横浜駅", "JR新幹線・横浜線", "徒歩14分"], ["新横浜駅", "地下鉄・相鉄東急新横浜線", "徒歩12分"], ["小机駅", "JR横浜線", "徒歩7分"]],
    luggage: "公園の第3レストハウス、新横浜・小机・北新横浜の駅ロッカーと予約店舗を探せます。第2レストハウスは貴重品専用です。館内のスーツケース対応は主催者に確認してください。",
    preparationTitle: "終演後に取り出せる場所を選ぶ", preparation: "公園のロッカーは原則9〜21時、冬季は17時まで。キュービックプラザは場所により24時間または4:30〜24:30です。料金・取り出し時刻を個別詳細で確認してください。",
    accessUrl: "https://www.nissan-stadium.jp/access/train.php", eventsUrl: "https://www.nissan-stadium.jp/",
    faq: [["E13は席のブロック名ですか？", `常設スタンドの観客席入口名です。入口が担当する全席境界は確認中です。${nissanGuide.seatNote}`], ["1階席と設備の1Fは同じですか？", "券面の1階席は4・5F、2階席は6・7Fです。設備の階を選んで探してください。"], ["授乳室はありますか？", "常設授乳室はありません。主催者が設ける場合があるため、公演案内を確認してください。おむつ交換台は男女すべてのトイレにあります。"], ["大きな荷物は預けられますか？", "館内の対応は主催者に確認してください。公園の第2は貴重品専用、第3の収納寸法は確認中です。駅の大型ロッカーや事前予約の店舗預かりを設備欄で探せます。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"nissan-stadium",data,};
export default definition;
