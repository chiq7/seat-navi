import { makeSaitamaGuide, saitamaSuperArenaGuide } from "@/data/venueGuides/saitama-super-arena";
import { saitamaAreas, saitamaFacilityConfig, saitamaLevels, saitamaSeats, type SaitamaMode } from "@/data/venueGuides/saitama-super-arena/config";
import type { ArenaGuideDefinition, ArenaVenueData } from '../arenaDefinition';
const data: ArenaVenueData = {
    guide: saitamaSuperArenaGuide, seats: saitamaSeats.arena, levels: saitamaLevels("arena"), areas: saitamaAreas, facilities: saitamaFacilityConfig("arena"),
    seatNote: "図は改修前の参考配置です。現在の愛称はGMOアリーナさいたま。メインアリーナ等は2027年3月末まで改修休館予定です。",
    facilityNote: "1〜5Fの参考配置です。利用できる区域・営業再開後の変更は公演案内をご確認ください。",
    access: [["さいたま新都心駅", "JR京浜東北線・宇都宮線・高崎線", "徒歩3分"], ["北与野駅", "JR埼京線", "徒歩7分"]],
    luggage: "館内1Fインフォメーション横、けやきひろば1Fの4か所、さいたま新都心駅・北与野駅・コクーンシティのロッカーを案内します。駅の改札内や閉館後に取り出せない施設は利用条件をご確認ください。",
    preparationTitle: "会場モードと使用席", preparation: "チケット・主催者案内のメインアリーナモード／スタジアムモードを選んでください。アリーナ席・ステージ位置・使用席は公演ごとの配置です。",
    accessUrl: "https://www.saitama-arena.co.jp/access/train.html", eventsUrl: "https://www.saitama-arena.co.jp/",
    faq: [["列・番号で探せますか？", "モードと200〜500レベルを選び、列・番号を入力できます。メインアリーナモードの200レベルはA〜L列にも対応。改修前の公式座席案内を基にしています。"], ["扉番号で探せますか？", "207扉などを番号欄へ入力すると、扉の周辺へ拡大します。そこから席のブロックを選べます。扉の位置と担当する座席範囲は別です。"], ["モードの違いは？", "メインアリーナモードとスタジアムモードでは客席の配置が変わります。チケットや主催者の会場図に合わせて選んでください。"], ["現在利用できますか？", "スタジアム・メインアリーナ・コミュニティアリーナは改修工事のため2027年3月末まで休館予定です。施設ごとの営業は公式案内をご確認ください。"]],
  };

const definition: ArenaGuideDefinition = {venueId:"saitama-super-arena",data,initialMode:"arena", modes:{"ariaLabel":"会場モード","caption":"会場モード","options":[{"id":"arena","label":"メインアリーナモード"},{"id":"stadium","label":"スタジアムモード"}]},
resolveMode(mode){const selected:SaitamaMode=mode==="stadium"?"stadium":"arena";const guide=makeSaitamaGuide(selected);return {guide,seats:saitamaSeats[selected],levels:saitamaLevels(selected),areas:data.areas,facilities:saitamaFacilityConfig(selected),seatNote:data.seatNote};},
};
export default definition;
