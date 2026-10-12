import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { miyagiSeats } from "./config";

export const miyagiNotice = "2026年10月26〜28日は停電点検のため全施設休館、10月29日から通常営業の予定です。公演日の交通・入場案内も確認してください。";
export const miyagiGuide: DedicatedVenueGuide = {
  venueId: "miyagi-arena", name: "セキスイハイムスーパーアリーナ", seatTypes: ["メインアリーナ2階スタンド"],
  seatNote: "メインアリーナA〜Zの前方・後方を選べます。各範囲の前後列と印字された両端番号、Gの5〜21列・Tの9〜21列を部分検索できます。中間の列・番号、特殊席と公演アリーナは確認中です。サブアリーナの座席図とは異なります。",
  diagramNote: "公式のスタンド図と番号の補助図を照合した参考図です。公演ごとのステージ・可動席は固定しません。",
  seats: miyagiSeats.blocks.map(b => ({ id: b.id, label: b.label, type: b.level, floor: b.level, x: b.center[0], y: b.center[1], rows: [], sourceIds: b.sourceIds })),
  sources: current.sources as GuideSource[], facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[],
  routes: [
    { id: "miyagi-rifu", from: "JR利府駅", exit: "会場行きバス", stops: ["菅谷台四丁目"], destination: "メインアリーナ", note: "菅谷台経由・青葉台経由のバス約10分。3丁目はスタジアム側です。当日の運行・シャトルは主催者案内を確認してください。", sourceIds: ["access"] },
    { id: "miyagi-walk", from: "JR利府駅", exit: "徒歩", stops: [], destination: "メインアリーナ", note: "公式目安3km・45分。指定入口・精密な連続経路や全区間段差なしは未確認です。", sourceIds: ["access"] },
  ],
  unverified: [
    "A〜Zの通常席4919参考セルを、原図の区画と椅子の向きを照合した前方・後方52参考範囲へ接続。全物理ブロック数・現在の公演席数ではありません。既存G17列帯194キー/T13列帯150キーを保持し、各範囲の前後列の個別印字端202キーを追加。短い列・中抜けと東側S/T/Uの青い特殊区域を通常席から区別します。中間の列・番号、青い特殊席、サブ474席、公演可動席は後段です。",
    "現行公式リンクの2014スタンド図・ファイル名20260422の1F図(図内09.08.20)・パンフレット(図内2021.3)とLiveWalker作成20260828の補助図を区別。補助図のアリーナ配置は公演へ適用しません。",
    "メイン1/2Fとサブ1/2Fの主要設備を分離。授乳・おむつ交換・メインAEDの個別階/位置は確認中。観客席から設備階はnullで手動条件を保持します。",
    "コインロッカーは公式FAQのサブ1Fロビー等へ図外一覧で接続。メイン1F競技者更衣室を観客用ロッカーへ昇格しません。メイン/屋外の一般荷物預かり、利府駅の個別設備・条件は確認中です。",
    "仙台駅11ロッカー区域・3F有人預かりを図外一覧へ接続。改札内の区域は乗車券が必要。機械内寸/加算/空きは未確定。Multi ecubeの500円/BOXは予約料金です。有人預かりは9:30〜19:00、1個1日500〜2000円、1個30kgまで・最大30日。ホテル配送料金を混ぜません。",
    "公式FAQに売店なし、サブ2F喫茶店あり。客席では飲食不可、ロビー/コンコースは公演条件によります。喫茶店名/営業時間・ロッカー観客利用境界は未確定です。",
    "2026-10-06告知の10/26〜28停電点検休館と2026-07-10告知の2029年度中改修予定を保持。2027年度の旧予定を現在予定にしません。サブは大型改修対象外の予定、正確な工期は未確定です。",
    "OpenPOIの地域限定2飲食候補・荷物0はlicenses/attributionsを記録。API候補を確認済み施設へ自動昇格しません。敷地/駅の精密入口・連続経路、全札/全条件と実機多点は後段です。",
  ],
  rights: { url: "https://cdn-zaseki.music-mdata.com/pdf/9531.pdf", checkedAt: "2026-10-10", status: "publish-use-unconfirmed", note: "MUSIC-MDATA掲載・LiveWalker作成。原図/PDF/ロゴは研究用のみ。ダウンロード可能を転載許可と扱わず、公開データは事実と独自の区域線です。" },
};
