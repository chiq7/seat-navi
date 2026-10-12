import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { hiroshimaSeats } from "./config";

export const hiroshimaNotice = "次の施設整備日は2026年11月9日で、施設利用・受付対応はできません。以降の日程は公式のお知らせを確認してください。";
export const hiroshimaGuide: DedicatedVenueGuide = {
  venueId: "hiroshima-arena", name: "広島グリーンアリーナ", seatTypes: ["大アリーナ固定スタンド"],
  seatNote: "大アリーナA〜Jの固定スタンドを選べます。主要な前方12・13列と後方の確認済み通路範囲を部分検索できます。短いF14は34〜42番・45〜52番、G14は2〜10番など印字どおりです。未接続の番号は確認中です。公演では券面・主催者案内を優先してください。",
  diagramNote: "現在公式リンクの固定席図と2019年の補助図を照合した参考図です。可動席・貴賓席・公演アリーナの配置は固定しません。",
  seats: hiroshimaSeats.blocks.map(b => ({ id: b.id, label: b.label, type: b.level, floor: b.level, x: b.center[0], y: b.center[1], rows: [], sourceIds: b.sourceIds })),
  sources: current.sources as GuideSource[], facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[],
  routes: [
    { id: "hiroshima-astram", from: "アストラムライン県庁前駅", exit: "西2出口（基町クレド側）", stops: [], destination: "広島グリーンアリーナ", note: "公式指定出口。公演の使用入口・精密な連続経路は確認中です。", sourceIds: ["access-current"] },
    { id: "hiroshima-bus", from: "広島バスセンター / 紙屋町", exit: "下車後、会場へ", stops: [], destination: "広島グリーンアリーナ", note: "広島駅から紙屋町までバス約10分。停留所から公演入口までの所要時間ではありません。", sourceIds: ["access-current"] },
    { id: "hiroshima-tram", from: "紙屋町西 / 原爆ドーム前", exit: "路面電車下車", stops: [], destination: "広島グリーンアリーナ", note: "広島駅から紙屋町西まで約15分は車内移動の目安。徒歩区間・指定入口は当日案内を確認してください。", sourceIds: ["access-current"] },
  ],
  unverified: [
    "固定席4708参考セルと83通路分離参考範囲を保持。全物理ブロック数・現在の公演席数ではありません。既存F/G2範囲28列帯290印字キーを保持し、A〜Jの主要前方/後方20範囲106列帯1083キーを追加。累計22範囲134列帯1373キーは全席数/達成率ではありません。残る61参考範囲の番号、車いす/貴賓の精密輪郭、可動席・公演アリーナは後段です。",
    "補助図はMUSIC-MDATA掲載/LiveWalker作成、図内20191120。現在公式固定配席図の主要A〜Jの通路分離・普通席前後と、補助図の短い列・印字/若い側を照合。前方の青可動席と中央特別席は今回の番号へ混ぜません。図内日付だけで現在の公演へ適用せず、ライブ部の同じ原図リンクを独立根拠に数えません。",
    "大アリーナ1F/B1、本館1F/B1、小アリーナ2/3F、武道場B1・弓道場B1を分離。点は代表区域。個別入口/設備台数の全数/連続経路は未確認。座席から設備階はnullで手動条件を保持します。",
    "本館B1授乳室横のロッカー1台13口は300/400円、21時以降取り出し不可。観客の入場前利用境界、屋外ロッカー・一般クロークは確認中です。競技者用更衣室を観客預かりへ昇格しません。",
    "バスセンター3Fロッカーと有人預かり、本通/県庁前駅、広島駅北側2FのCrostaを図外一覧へ接続。駅ロッカーの個別階・位置・改札境界/料金と各施設の空きは未確定。有人預かりとホテル配送は別サービスです。",
    "APIは中心半径800mで検索しlicenses/attributionsを保持。飲食20候補は重複/未確認を含み、掲載には公式個別ページを確認した店舗のみ採用。荷物1候補のAmazon受取ロッカーを旅行荷物預かりへ転用しません。",
    "場外は会場・駅出口・周辺の場所札と図外一覧。正確な敷地境界/ゲート・公演指定入口・連続経路・駅機械の位置は未制作/未確認です。全札/全境界・実機多点・全条件の最終比較は後段です。",
  ],
  rights: { url: "https://cdn-zaseki.music-mdata.com/pdf/18823.pdf", checkedAt: "2026-10-10", status: "publish-use-unconfirmed", note: "MUSIC-MDATA掲載・LiveWalker作成。転載再配布禁止。原図/PDF/ロゴは研究用のみ。公開データは読図した事実と独自区域線です。" },
};
