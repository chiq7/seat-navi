import { makeMarineGuide, marineMesseGuide } from "@/data/venueGuides/marine-messe";
import { marineAreas, marineFacilityConfig, marineLevels, marineSeats, type MarineMode } from "@/data/venueGuides/marine-messe/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: marineMesseGuide, seats: marineSeats.concert, levels: marineLevels, areas: marineAreas, facilities: marineFacilityConfig,
    seatNote: "アリーナの配置・使用席・座席番号は、公演の案内をご確認ください。",
    facilityNote: "会場A館の1F・2Fです。B館の設備とは別です。図に位置がない設備は場所一覧から確認できます。",
    access: [["呉服町駅", "福岡市地下鉄 箱崎線", "徒歩15分"], ["中洲川端駅", "福岡市地下鉄 空港線・箱崎線", "徒歩18分"]],
    luggage: "1Fエントランスロビー両側のロッカーと、ベイサイドプレイス博多・主要駅のロッカーを探せます。",
    preparationTitle: "バスと帰りの荷物", preparation: "博多駅西日本シティ銀行前F、天神ソラリアステージ前2Aからマリンメッセ前へ。ベイサイドのロッカーは23:00〜翌6:30、駅は終電後に取り出せません。",
    accessUrl: "https://www.marinemesse.or.jp/messe/", eventsUrl: "https://www.marinemesse.or.jp/messe/",
    faq: [["どちらの座席図を選べばいいですか？", "主催者の座席図に合わせてコンサート／センターステージを選んでください。センターステージにはD・E区画があります。ステージ位置と使用席は公演により異なります。"], ["2階席はどのブロックですか？", "H〜Sが2階席です。立ち見は2階スタンド席後方で、アリーナのスタンディングとは別です。"], ["B館も同じ座席図ですか？", "この図はA館専用です。B館の公演には使えません。"], ["授乳室やAEDはありますか？", "授乳室は1F東エントランス側。AEDは1F東エントランス、2F海のモール、防災センターにあります。緊急時は会場係員へお声がけください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"marine-messe",data,initialMode:"concert", modes:{"ariaLabel":"公式座席図のパターン","caption":"座席図","options":[{"id":"concert","label":"コンサート"},{"id":"center","label":"センターステージ"}]},
resolveMode(mode){const selected:MarineMode=mode==="center"?"center":"concert";const guide=makeMarineGuide(selected);return {guide,seats:marineSeats[selected],levels:data.levels,areas:data.areas,facilities:data.facilities,seatNote:data.seatNote};},
};
export default definition;
