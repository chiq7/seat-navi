export type ManualEvent = {
  artist_slug?: string;
  title: string;
  date: string;
  venue: string;
};

export type ManualReview =
  | { action: "ignore"; reason: string }
  | { action: "replace"; reason: string; events: ManualEvent[] };

const ignore = (reason: string): ManualReview => ({ action: "ignore", reason });
const replace = (reason: string, events: ManualEvent[]): ManualReview => ({ action: "replace", reason, events });
const dated = (title: string, venue: string, dates: string[], artist_slug?: string): ManualEvent[] =>
  dates.map((date) => ({ title, venue, date, ...(artist_slug ? { artist_slug } : {}) }));

// AIが安全側に保留した記事を、公式発表の本文・公演ページで人手確認した結果。
// ここへ残すことで、毎回同じ記事を再判定せず、誤った記事日付やアーティスト紐付けも再発させない。
export const MANUAL_EVENT_REVIEWS: Record<string, ManualReview> = {
  "c0168dfc-efbf-4ede-9b0a-c1ffecf9a140": ignore("ポスタービジュアル公開のみ。CHANYEOLツアー本体は登録済み"),
  "849c3eb0-5898-497f-8534-f941e673a994": ignore("チケット販売延期のお知らせ。ソウル公演本体は登録済み"),
  "6151972d-0f48-4b34-ae2d-3398a36979e4": replace("会場は主催者が東京都某所としているが、日付確定の対面イベント", [
    ...dated("ZEROBASEONE Japan 2nd EP 『回帰LOVE』発売記念 スペシャルオフラインイベント", "東京都某所", ["2026-08-23", "2026-08-24", "2026-08-25"]),
  ]),
  "00873e2d-bb0b-4d07-ba73-827a64ba7d13": ignore("試写会はNEWSとして保持し、将来の専用ページまで公演一覧へ反映しない"),
  "6d67cfb4-d2eb-441d-83c9-ddef93d9a5cf": ignore("一般発売のお知らせ。ME:I WAY公演本体は登録済み"),
  "094ba588-5bee-4eb7-90bb-eec7731d1495": replace("本文で出演日・会場を確認", [
    ...dated("ディズニー・オン・アイス 名古屋公演 スペシャルオープニングアクト", "クロコくんホール", ["2026-08-01"]),
  ]),
  "49c28099-810d-4a1f-b342-ea4fd54d981c": replace("神戸の販売告知から公式ツアー全日程を確認", [
    ...dated("TREASURE THE STAGE 2026 NEW WAV : LIVE IN JAPAN", "大阪城ホール", ["2026-07-08", "2026-07-09"]),
    ...dated("TREASURE THE STAGE 2026 NEW WAV : LIVE IN JAPAN", "Kアリーナ横浜", ["2026-07-18", "2026-07-19", "2026-07-20"]),
    ...dated("TREASURE THE STAGE 2026 NEW WAV : LIVE IN JAPAN", "GLION ARENA KOBE", ["2026-07-25", "2026-07-26"]),
    ...dated("TREASURE THE STAGE 2026 NEW WAV : LIVE IN JAPAN", "IGアリーナ", ["2026-08-01", "2026-08-02"]),
    ...dated("TREASURE THE STAGE 2026 NEW WAV : LIVE IN JAPAN", "サンドーム福井", ["2026-08-08", "2026-08-09"]),
    ...dated("TREASURE THE STAGE 2026 NEW WAV : LIVE IN JAPAN", "マリンメッセ福岡A館", ["2026-08-22", "2026-08-23"]),
    ...dated("TREASURE THE STAGE 2026 NEW WAV : LIVE IN JAPAN", "有明アリーナ", ["2026-09-05", "2026-09-06"]),
  ]),
  "c9e66530-fc17-4f3a-9d95-adc7f54ea6d3": replace("会場マップ公開日ではなく公式ツアー全日程を採用", [
    ...dated("すとろべりーめもりー Vol.10th anniversary ～すとぷり ARENA TOUR～", "IGアリーナ", ["2026-06-20", "2026-06-21"]),
    ...dated("すとろべりーめもりー Vol.10th anniversary ～すとぷり ARENA TOUR～", "大阪城ホール", ["2026-07-04", "2026-07-05"]),
    ...dated("すとろべりーめもりー Vol.10th anniversary ～すとぷり ARENA TOUR～", "マリンメッセ福岡A館", ["2026-07-25", "2026-07-26"]),
    ...dated("すとろべりーめもりー Vol.10th anniversary ～すとぷり ARENA TOUR～", "国立代々木競技場 第一体育館", ["2026-08-18", "2026-08-19", "2026-08-20"]),
  ]),
  "eab1fbfb-6aed-4a8f-a007-c0677855949c": ignore("記事公開日を公演日として誤抽出したチケット受付告知。ツアー本体は登録済み"),
  "ee22dcd9-52ec-49bc-ba44-4073379f14d4": replace("記事タイトルで3公演日と会場を確認", [
    ...dated("ゆず 弾き語りアリーナツアー 2026 心音", "横浜アリーナ", ["2026-07-24", "2026-07-25", "2026-07-26"]),
  ]),
  "f2b91648-9c6a-4ce8-8f90-19ffb2476530": replace("長期上映は各映画館の上映開始日を1件として登録", [
    ...dated("TXT VRコンサート（2026年夏 上映）", "109シネマズプレミアム新宿", ["2026-07-31"]),
    ...dated("TXT VRコンサート（2026年夏 上映）", "T・ジョイ博多", ["2026-07-31"]),
    ...dated("TXT VRコンサート（2026年夏 上映）", "109シネマズ広島", ["2026-08-01"]),
    ...dated("TXT VRコンサート（2026年夏 上映）", "横浜ブルク13", ["2026-08-14"]),
    ...dated("TXT VRコンサート（2026年夏 上映）", "109シネマズ名古屋", ["2026-08-27"]),
    ...dated("TXT VRコンサート（2026年夏 上映）", "109シネマズ富谷", ["2026-09-03"]),
    ...dated("TXT VRコンサート（2026年夏 上映）", "T・ジョイ梅田", ["2026-09-03"]),
  ]),
  "6db1aac9-6618-4721-9da3-3ac34d3d983a": replace("ACEesの記事ではないため、出演が確認できた登録アーティストへ付け替え", [
    ...dated("SUMMER SONIC 2026", "ZOZOマリンスタジアム＆幕張メッセ", ["2026-08-15"], "kento-nakajima"),
    ...dated("SUMMER SONIC 2026", "万博記念公園", ["2026-08-16"], "kento-nakajima"),
    ...dated("SUMMER SONIC 2026", "万博記念公園", ["2026-08-14"], "travis-japan"),
    ...dated("SUMMER SONIC 2026", "ZOZOマリンスタジアム＆幕張メッセ", ["2026-08-16"], "travis-japan"),
  ]),
  "e9957ed2-cbd7-45eb-b11e-7707c901fd6f": replace("会場変更後のGメッセ群馬を採用", [
    ...dated("MAZZEL 2nd Fan Meeting -Play at the MUZEUM Vol.2-", "Gメッセ群馬", ["2026-12-03"]),
  ]),
  "53354f65-646e-49cc-be0d-45b78aadf2e2": replace("本文で年・出演日・会場を確認", [
    ...dated("FEST. INAZUMA 2026", "滋賀県草津市 烏丸半島芝生広場", ["2026-09-19"]),
  ]),
  "47a3bd85-5246-488d-8b0c-9878f27c6484": ignore("物販運用のお知らせ。東京ドーム公演本体は登録済み"),
  "968d5b17-a647-42b1-bf68-8da3fcc3580d": ignore("野球の試合のため対象外"),
  "98cf63b4-eb71-49ab-b5b4-0811f3296921": ignore("野球の試合のため対象外"),
  "9590aa79-540a-4ffe-b699-0ad8ecce7614": ignore("オンラインミーグリはNEWSとして保持し、将来の専用ページまで公演一覧へ反映しない"),
  "940703e0-4af0-4ceb-894a-3dadfee6652f": replace("本文で年・出演日・会場を確認", [
    ...dated("CDTVライブ！ライブ！ 秋の大感謝祭2026", "東京ガーデンシアター", ["2026-09-11"]),
  ]),
  "a6170dac-63c5-4917-8b5f-0864513741e9": ignore("WEST.中間淳太の記事でありACEesのイベントではない"),
  "96f0c2f2-29e4-4db9-92f6-3fb240e46238": ignore("後続の詳細記事から同じリリースイベント2件を登録済み"),
  "00b10300-978d-4f95-aa44-728966ae13c9": replace("公式イベント概要で出演日・会場を確認", [
    ...dated("LuckyFes'26", "国営ひたち海浜公園", ["2026-08-08"]),
  ]),
  "afc948a2-581f-42e2-8eda-8791ad1ff256": ignore("記事の年欠落。年・会場確定済みの同イベント2件を登録済み"),
  "31c0127d-7960-418e-98c2-eb1a94196c3e": replace("ACEesは出演者ではないため、登録済み出演者のなにわ男子へ付け替え", [
    ...dated("KAMIGATA EXPO PARK FES 2026", "万博記念公園", ["2026-10-31", "2026-11-01"], "naniwa-danshi"),
  ]),
  "b0a21d0b-f0d5-4cf0-b660-2ea0779ce0cd": ignore("WEST.中間淳太の記事でありACEesのイベントではない"),
  "3adf1b63-4d1b-47ab-a751-1d5de765623b": ignore("WEST.の記事でありACEesのイベントではない"),
  "a21e463d-f263-44c1-ab31-c10fd60d7e33": ignore("プレイガイド情報。NEWSツアー本体は登録済み"),
  "3d88ebd6-d16c-47c5-a9db-be3f8133908b": ignore("配信のお知らせ。東京ドーム公演本体は登録済み"),
  "06e25e1d-587d-42b1-9db4-3aa2fe8db73c": ignore("中止済みイベントで日付・会場も確定できない"),
  "f9acc730-61bb-4373-bfc0-52a7fd9f4328": ignore("WEST.の記事でありACEesのイベントではない"),
  "c8a3013c-cd81-4281-a41b-83d16845d314": replace("公式開催概要でNEWS出演日と会場を確認", [
    ...dated("KOYABU SONIC 2026", "インテックス大阪 4号館・5号館", ["2026-09-22"]),
  ]),
  "e3602f64-9c03-4f60-aa80-e2b55368fc2d": ignore("日程なしの開催発表。NEWSツアー本体は登録済み"),
  "9f0b6f30-e637-46a9-8748-d8550ea07f41": ignore("注意事項のお知らせ。東京ドーム公演本体は登録済み"),
  "159810a1-3705-4c2b-af17-379dbf7853c5": replace("公式公演ページで4日程・会場を確認", [
    ...dated("BATTLE OF TOKYO ～RE:BIRTH～", "LaLa arena TOKYO-BAY", ["2026-08-23", "2026-08-24", "2026-08-25", "2026-08-26"]),
  ]),
  "2d4b19b2-efee-43bd-93d6-2379a6c4f4cf": ignore("広島公演に連動する抽選キャンペーンであり、公演本体ではない"),
  "ac79b804-19ed-45f3-b546-5c7d8bb79b29": ignore("広島公演に連動するステッカー企画であり、公演本体ではない"),
  "e8741d8b-696d-4162-a12f-9027759fff01": ignore("出演日の8月2日 Grant Park公演が登録済み"),
  "7bad229f-4ff4-4ab8-be20-981c0b1f7ce9": ignore("出演日の7月31日 Parc Jean-Drapeau公演が登録済み"),
  "e876ee3b-633c-42ab-85e1-8522290a75b6": replace("長期展示は全営業日ではなく初日を1件として登録", [
    ...dated("THE BOOK OF SCENES（2026年7月24日～9月13日）", "New Gallery", ["2026-07-24"]),
  ]),
};
