import { tokiGuide, makeTokiGuide } from "@/data/venueGuides/toki-messe";
import { tokiSeats, tokiLevels, tokiAreas, makeTokiFacilityConfig, type TokiMode } from "@/data/venueGuides/toki-messe/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide:tokiGuide,seats:tokiSeats.exhibition,levels:tokiLevels("exhibition"),areas:tokiAreas("exhibition"),facilities:makeTokiFacilityConfig(),
    seatNote:tokiGuide.seatNote,
    facilityNote:"展示場・入口・会議場・エスプラナードを階で選べます。万代島ビルの店舗と新潟駅の荷物は「場外・入場前」から探せます。",
    access:[["新潟駅", "1Fバスターミナル17番／佐渡汽船線・朱鷺メッセ下車", "バス約17分"],["新潟駅", "万代橋方面から会場へ", "徒歩約25分"]],
    accessNote:"バスの時間は乗車の目安です。当日の使用入口・運行は公式案内をご確認ください。",
    accessUrl:"https://www.tokimesse.com/visitor/access/",officialRouteUrl:"https://www.tokimesse.com/visitor/access/",routeLabel:"徒歩・バスの来場案内 ↗",eventsUrl:"https://www.tokimesse.com/visitor/event/index",
    luggage:"館内1F・2Fのロッカー、新潟駅のロッカーと有人預かりを探せます。返金式と大型有料ではサイズ・料金が異なります。",
    preparationTitle:"100円硬貨と公演の会場名",preparation:"無料の返金式ロッカーは100円硬貨が必要です。1Fは20時、2Fは22時まで。展示ホールとメインホールは別室なので、券面の会場名と指定入口を確認してください。",
    faq:[["列・席番号で探せますか？","朱鷺メッセの座席は公演ごとの配置です。公開されている配置サンプルを常設席として扱いません。展示ホールA/Bまたはスノーホールを探し、列・番号は主催者の座席図をご確認ください。"],["館内ロッカーはいくらですか？","1Fと2Fの返金式は100円を入れ、利用後に返金されます。2Fの大型8口は200円/日、24時を越えると1日につき200円追加です。設備欄でサイズと利用時間を確認できます。"],["駅で大きな荷物を預けられますか？","CoCoLo新潟2F EAST SIDEの佐川急便は当日一時預かりを10〜20時に受付。店舗は20:30までですが預かり時間は異なります。新潟駅お荷物サービスカウンターの現在の入口・受付条件は運営元へご確認ください。"],["授乳室はどこですか？","2Fアトリウムにあります。給湯シンク・ベビーベッド・授乳用ソファー・椅子を備えています。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"toki-messe",data,initialMode:"exhibition", modes:{"ariaLabel":"朱鷺メッセの部屋","caption":"会場","options":[{"id":"exhibition","label":"展示ホールA/B"},{"id":"main","label":"メインホール（スノーホール）"}]},
resolveMode(mode){const selected:TokiMode=mode==="main"?"main":"exhibition";const guide=makeTokiGuide(selected);return {guide,seats:tokiSeats[selected],levels:tokiLevels(selected),areas:tokiAreas(selected),facilities:makeTokiFacilityConfig(selected),seatNote:guide.seatNote};},
};
export default definition;
