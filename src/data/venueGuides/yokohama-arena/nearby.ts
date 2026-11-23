import type { FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { GuideFacility, GuideSource } from "../types";

// Parking and places to meet near the arena. Each fact is read from the operator's or the
// venue's own page on the checked date; prices and spaces can change, so every entry also
// tells the reader to follow the sign on site. No map pins: these are text-only places.
const checkedAt = "2026-11-23";
const access = "https://www.yokohama-arena.co.jp/access/";
const navipark = "https://www.navipark1.com/sp/parkingDetail/N05876.html";
const times = (id: string) => `https://times-info.net/P14-kanagawa/C109/park-detail-${id}/`;
const prince = "https://www.princehotels.co.jp/shinyokohama/facility/parking/";
const repark = "https://www.repark.jp/parking_user/time/result/detail/?park=REP0001684";
const paraca = "http://search.ipos-land.jp/p/detailp.aspx?id=CA2900936";

export const yokohamaNearbySources: GuideSource[] = [
  { id: "ya-access-parking", title: "横浜アリーナ・交通アクセス（駐車場）", url: access, checkedAt, scope: "来場者用の駐車場・駐輪場はない、公共交通機関の利用、車での来場を控える、路上駐車をしないとの案内を確認。", usage: "facts-only" },
  { id: "ya-navipark-1", title: "ナビパーク 新横浜第1", url: navipark, checkedAt, scope: "所在地・時間貸41台・24時間・車両制限・通常料金と昼夜の最大料金、特別日の料金を確認。", usage: "facts-only" },
  { id: "ya-times-38", title: "タイムズ新横浜第38", url: times("BUK0057060"), checkedAt, scope: "所在地・28台・24時間・時間帯別料金と曜日別の当日最大料金を確認。", usage: "facts-only" },
  { id: "ya-times-32", title: "タイムズ新横浜第32", url: times("BUK0038372"), checkedAt, scope: "所在地・8台・24時間・通常料金と駐車後24時間の最大料金を確認。", usage: "facts-only" },
  { id: "ya-times-3", title: "タイムズ新横浜第3", url: times("BUK0001999"), checkedAt, scope: "所在地・7台・24時間・時間帯別料金と駐車後12時間の最大料金を確認。", usage: "facts-only" },
  { id: "ya-times-6", title: "タイムズ新横浜第6", url: times("BUK0002021"), checkedAt, scope: "所在地・2台・24時間・通常料金（最大料金なし）を確認。", usage: "facts-only" },
  { id: "ya-prince-parking-times", title: "新横浜プリンスホテル・プリンスペペ駐車場（タイムズ）", url: times("BUK0020979"), checkedAt, scope: "所在地・761台・24時間・通常料金と平日の当日最大料金、土日祝の最大料金なしを確認。", usage: "facts-only" },
  { id: "ya-prince-parking-notice", title: "新横浜プリンスホテル・駐車場のお知らせ", url: prince, checkedAt, scope: "プリンスペペの営業終了に伴い駐車場が2027年3月31日で営業終了、以降の提携駐車場なしとの案内を確認。", usage: "facts-only" },
  { id: "ya-repark-3-3", title: "三井のリパーク 新横浜3丁目第3", url: repark, checkedAt, scope: "所在地・48台・24時間・15分200円・入庫後24時間の最大料金・車両制限を確認。", usage: "facts-only" },
  { id: "ya-paraca-arena-1", title: "パラカ横浜アリーナ前第1（駐車場の空き・料金案内）", url: paraca, checkedAt, scope: "所在地・11台・24時間・15分300円、夜間と24時間の最大料金、特定日の最大料金を確認。", usage: "facts-only" },
  { id: "ya-saizeriya-arena", title: "サイゼリヤ 新横浜アリーナ通り店", url: "https://shop.saizeriya.co.jp/sz_restaurant/spot/detail?code=0620", checkedAt, scope: "所在地・営業時間8:00〜23:00・電子マネー/クレジット対応を確認。", usage: "facts-only" },
  { id: "ya-mcdonalds-ekimae", title: "マクドナルド 新横浜駅前店", url: "https://map.mcdonalds.co.jp/map/14636", checkedAt, scope: "所在地・店内5:00〜24:00（0〜5時は持ち帰りのみ）・115席・日曜深夜のメンテナンス閉店を確認。", usage: "facts-only" },
  { id: "ya-starbucks-3chome", title: "スターバックス コーヒー 新横浜3丁目店", url: "https://store.starbucks.co.jp/detail-219/", checkedAt, scope: "所在地・営業時間7:00〜22:00・不定休を確認。", usage: "facts-only" },
  { id: "ya-laohana", title: "ラ・オハナ 新横浜店", url: "https://store-info.skylark.co.jp/la_ohana/map/198583/", checkedAt, scope: "所在地・営業時間（平日10:30〜23:00、土日祝8:00〜23:00）を確認。", usage: "facts-only" },
  { id: "ya-bigecho-arena", title: "ビッグエコー 新横浜アリーナ通り店", url: "https://big-echo.jp/shop_info/%E3%83%93%E3%83%83%E3%82%B0%E3%82%A8%E3%82%B3%E3%83%BC%E6%96%B0%E6%A8%AA%E6%B5%9C%E3%82%A2%E3%83%AA%E3%83%BC%E3%83%8A%E9%80%9A%E3%82%8A%E5%BA%97", checkedAt, scope: "所在地・9:00〜翌5:00・年中無休・最大30人、周辺施設のイベント日の特別料金とフリータイム変更の案内を確認。", usage: "facts-only" },
  { id: "ya-royalhost", title: "ロイヤルホスト 新横浜駅ビル店", url: "https://locations.royalhost.jp/detail/199597/", checkedAt, scope: "所在地（キュービックプラザ新横浜10F）・営業時間6:30〜23:00・急な時間変更の注記を確認。130席はビル側の店舗ページで確認。", usage: "facts-only" },
  { id: "ya-cubic-restaurants", title: "キュービックプラザ新横浜・営業時間（レストラン街）", url: "https://www.cubicplaza.com/business-hours/guide/restaurant", checkedAt, scope: "9F・10Fレストラン街の営業時間11:00〜23:00、店ごとに時間・中休みが異なることを確認。", usage: "facts-only" },
  { id: "ya-sukiya-arena", title: "すき家 横浜アリーナ前店", url: "https://maps.sukiya.jp/jp/detail/1029.html", checkedAt, scope: "所在地・営業時間4:00〜翌3:00（3〜4時は休業）・店内禁煙を確認。", usage: "facts-only" },
  { id: "ya-cotedazur", title: "カラオケ コート・ダジュール 新横浜駅前店", url: "https://www.cotedazur.jp/branch/detail/10116.html", checkedAt, scope: "所在地（新横浜ゲートサイド9F）・9:00〜翌5:00・年中無休・最大24人・パーティールーム・持ち込み可を確認。", usage: "facts-only" },
  { id: "ya-kaikatsu", title: "快活CLUB 新横浜店", url: "https://www.kaikatsu.jp/shop/detail/20901.html", checkedAt, scope: "所在地・カラオケルームあり・食事メニューなしを確認。営業時間は店舗ページに明記なし。", usage: "facts-only" },
  { id: "ya-kaikatsu-event", title: "快活CLUB 新横浜店・イベント特別料金のお知らせ", url: "https://www.kaikatsu.jp/info/detail/202611event_20901.html", checkedAt, scope: "2026年11〜12月のイベント期間の特別料金、期間中のひとりカラオケ2名分料金・電話予約停止を確認。", usage: "facts-only" },
  { id: "ya-park-ekimae", title: "横浜市港北区・新横浜駅前公園", url: "https://www.city.yokohama.lg.jp/kohoku/kurashi/machizukuri_kankyo/jimusho/koen_ryokudo/map-seach/c-2/sinyokohamaekimae.html", checkedAt, scope: "所在地・面積・トイレ（身障者用あり）・水飲み・ベンチ・駐車場なしを確認。", usage: "facts-only" },
];

const parkingNote = "料金・台数は変わることがあります。現地の看板を確認してください。公演日は満車になりやすく、特別料金になる駐車場もあります。";
const parking = (id: string, name: string, location: string, detail: string, sourceIds: string[]): GuideFacility => ({
  id, name, purpose: "案内", kind: "parking", floor: "周辺の駐車場", scope: "場外", location, detail: `${detail}${parkingNote}`, sourceIds, precision: "text-only",
});

export const yokohamaNearbyFacilities: GuideFacility[] = [
  { id: "ya-parking-none", name: "横浜アリーナには来場者用の駐車場がありません", purpose: "案内", kind: "information", floor: "会場の案内", scope: "場外", location: "横浜アリーナ", detail: "会場に来場者用の駐車場・駐輪場はありません。公式は公共交通機関での来場を案内し、車での来場は控えるよう、路上駐車はしないよう求めています。", sourceIds: ["ya-access-parking"], precision: "text-only" },
  parking("ya-parking-navipark-1", "ナビパーク 新横浜第1", "新横浜3丁目22・41台", "時間貸41台・24時間。通常は20分300円、最大料金は8〜19時1,900円・19〜8時600円。運営会社が指定する特別日（例：11/20・21・23・25・28）は15分400円・8〜19時の最大3,900円になります。高さ2.1mまで。", ["ya-navipark-1"]),
  parking("ya-parking-repark-3-3", "三井のリパーク 新横浜3丁目第3", "新横浜3丁目18-11・48台", "48台・24時間。15分200円、入庫後24時間の最大料金2,600円（繰り返し適用）。高さ2mまで。", ["ya-repark-3-3"]),
  parking("ya-parking-paraca-1", "パラカ横浜アリーナ前第1", "新横浜3丁目9-6・11台", "11台・24時間。15分300円。最大料金は20〜8時500円、入庫後24時間2,200円、特定日は入庫後24時間2,900円。", ["ya-paraca-arena-1"]),
  parking("ya-parking-times-38", "タイムズ新横浜第38", "新横浜3丁目8・28台", "28台・24時間。7〜22時は15分300円、22〜7時は60分100円。当日1日の最大料金は月〜土2,600円、日祝2,100円（24時まで）。", ["ya-times-38"]),
  parking("ya-parking-times-32", "タイムズ新横浜第32", "新横浜3丁目21・8台", "8台・24時間。15分300円、駐車後24時間の最大料金2,200円。", ["ya-times-32"]),
  parking("ya-parking-times-3", "タイムズ新横浜第3", "新横浜3丁目23・7台", "7台・24時間。8〜24時は20分330円、0〜8時は60分110円、駐車後12時間の最大料金2,100円。", ["ya-times-3"]),
  parking("ya-parking-times-6", "タイムズ新横浜第6", "新横浜3丁目16・2台", "2台・24時間。15分300円で、最大料金はありません。", ["ya-times-6"]),
  { id: "ya-meet-saizeriya", name: "サイゼリヤ 新横浜アリーナ通り店", purpose: "飲食", kind: "restaurant", floor: "周辺のお店", scope: "場外", location: "新横浜3-18-16・新横浜交通ビル1F", detail: "ファミリーレストラン。8:00〜23:00。交通系電子マネー・クレジットカードが使えます。公演日は混み合うことがあります。", sourceIds: ["ya-saizeriya-arena"], precision: "text-only" },
  { id: "ya-meet-laohana", name: "ラ・オハナ 新横浜店", purpose: "飲食", kind: "restaurant", floor: "周辺のお店", scope: "場外", location: "大豆戸町665-1", detail: "ハワイアンのファミリーレストラン（すかいらーくグループ）。平日10:30〜23:00、土日祝8:00〜23:00。", sourceIds: ["ya-laohana"], precision: "text-only" },
  { id: "ya-meet-mcdonalds", name: "マクドナルド 新横浜駅前店", purpose: "飲食", kind: "fast-food", floor: "周辺のお店", scope: "場外", location: "新横浜3-6", detail: "115席。店内は5:00〜24:00、0:00〜5:00は持ち帰りのみ。日曜深夜はメンテナンスで閉まる日があります。", sourceIds: ["ya-mcdonalds-ekimae"], precision: "text-only" },
  { id: "ya-meet-starbucks", name: "スターバックス 新横浜3丁目店", purpose: "飲食", kind: "cafe", floor: "周辺のお店", scope: "場外", location: "新横浜3-17-2・友泉新横浜ビル", detail: "カフェ。7:00〜22:00、不定休。", sourceIds: ["ya-starbucks-3chome"], precision: "text-only" },
  { id: "ya-meet-bigecho", name: "ビッグエコー 新横浜アリーナ通り店", purpose: "飲食", kind: "karaoke", floor: "周辺のお店", scope: "場外", location: "新横浜2-3-10・YK-8ビル7F受付", detail: "カラオケ。9:00〜翌5:00、年中無休。最大30人まで入れる部屋があります。周辺施設のイベント日は特別料金になり、フリータイムの開始時刻が変わることがあります。", sourceIds: ["ya-bigecho-arena"], precision: "text-only" },
  { id: "ya-meet-royalhost", name: "ロイヤルホスト 新横浜駅ビル店", purpose: "飲食", kind: "restaurant", floor: "周辺のお店", scope: "場外", location: "キュービックプラザ新横浜10F（新横浜駅）", detail: "ファミリーレストラン。130席。6:30〜23:00（朝は朝食メニュー）。営業時間は急に変わることがあります。", sourceIds: ["ya-royalhost"], precision: "text-only" },
  { id: "ya-meet-cubic-restaurants", name: "キュービックプラザ新横浜 レストラン街", purpose: "飲食", kind: "restaurant", floor: "周辺のお店", scope: "場外", location: "新横浜駅ビル9F・10F", detail: "駅ビルの9F・10Fに15店ほどが入るレストラン街。11:00〜23:00で、店ごとに時間や昼夜の中休みが違います。", sourceIds: ["ya-cubic-restaurants"], precision: "text-only" },
  { id: "ya-meet-sukiya", name: "すき家 横浜アリーナ前店", purpose: "飲食", kind: "fast-food", floor: "周辺のお店", scope: "場外", location: "新横浜3-17-20", detail: "牛丼。4:00〜翌3:00（3〜4時は休み）。終演後の遅い時間も開いています。", sourceIds: ["ya-sukiya-arena"], precision: "text-only" },
  { id: "ya-meet-cotedazur", name: "カラオケ コート・ダジュール 新横浜駅前店", purpose: "飲食", kind: "karaoke", floor: "周辺のお店", scope: "場外", location: "新横浜3-6-2・新横浜ゲートサイド9F", detail: "カラオケ。9:00〜翌5:00、年中無休。最大24人、パーティールームあり。食べ物・飲み物の持ち込みができます。", sourceIds: ["ya-cotedazur"], precision: "text-only" },
  { id: "ya-meet-kaikatsu", name: "快活CLUB 新横浜店", purpose: "飲食", kind: "karaoke", floor: "周辺のお店", scope: "場外", location: "新横浜2-3-5・SR第2ビル2F受付", detail: "カラオケルームのある複合カフェ（食事メニューはなし）。イベント期間は特別料金になり、カラオケの1人利用は2名分の料金、電話予約は受け付けません。営業時間は店舗にご確認ください。", sourceIds: ["ya-kaikatsu", "ya-kaikatsu-event"], precision: "text-only" },
  { id: "ya-meet-park-ekimae", name: "新横浜駅前公園", purpose: "案内", kind: "park", floor: "周辺の公園", scope: "場外", location: "新横浜2-16-1・鳥山川沿い", detail: "川沿いに細長く続く大きな公園です。トイレ（車いす対応あり）・水飲み・ベンチがあります。車は停められません。夜間や大人数での利用は周りに配慮しましょう。", sourceIds: ["ya-park-ekimae"], precision: "text-only" },
  parking("ya-parking-prince", "新横浜プリンスホテル・プリンスペペ駐車場", "新横浜3丁目4・761台", "761台・24時間。30分350円、平日は当日1日の最大1,900円、土日祝は最大料金なし。2027年3月31日で営業を終了します。", ["ya-prince-parking-times", "ya-prince-parking-notice"]),
];

const near = "会場周辺・新横浜3丁目";
export const yokohamaNearbyMeta: Record<string, Partial<FacilityMeta>> = Object.fromEntries([
  ["ya-parking-none", { name: "会場の駐車場（なし）", area: "横浜アリーナ", accessCondition: "公共交通機関での来場を公式が案内", outsideViewIds: ["access"], url: access }],
  ["ya-parking-navipark-1", { area: near, accessCondition: "24時間・特別日は料金が上がる", outsideViewIds: ["access"], url: navipark }],
  ["ya-parking-repark-3-3", { area: near, accessCondition: "24時間・現地の料金表示を確認", outsideViewIds: ["access"], url: repark }],
  ["ya-parking-paraca-1", { area: "会場の正面側・新横浜3丁目9", accessCondition: "24時間・特定日は料金が上がる", outsideViewIds: ["access"], url: paraca }],
  ["ya-parking-times-38", { area: near, accessCondition: "24時間・現地の料金表示を確認", outsideViewIds: ["access"], url: times("BUK0057060") }],
  ["ya-parking-times-32", { area: near, accessCondition: "24時間・現地の料金表示を確認", outsideViewIds: ["access"], url: times("BUK0038372") }],
  ["ya-parking-times-3", { area: near, accessCondition: "24時間・現地の料金表示を確認", outsideViewIds: ["access"], url: times("BUK0001999") }],
  ["ya-parking-times-6", { area: near, accessCondition: "24時間・2台だけ", outsideViewIds: ["access"], url: times("BUK0002021") }],
  ["ya-meet-saizeriya", { area: near, accessCondition: "8:00〜23:00", outsideViewIds: ["access"], url: "https://shop.saizeriya.co.jp/sz_restaurant/spot/detail?code=0620" }],
  ["ya-meet-laohana", { area: "会場周辺・新横浜駅寄り（大豆戸町）", accessCondition: "平日10:30〜・土日祝8:00〜23:00", outsideViewIds: ["access"], url: "https://store-info.skylark.co.jp/la_ohana/map/198583/" }],
  ["ya-meet-mcdonalds", { area: near, accessCondition: "店内5:00〜24:00", outsideViewIds: ["access"], url: "https://map.mcdonalds.co.jp/map/14636" }],
  ["ya-meet-starbucks", { area: near, accessCondition: "7:00〜22:00", outsideViewIds: ["access"], url: "https://store.starbucks.co.jp/detail-219/" }],
  ["ya-meet-bigecho", { area: "新横浜駅寄り・新横浜2丁目", accessCondition: "9:00〜翌5:00・イベント日は特別料金", outsideViewIds: ["access"], url: "https://big-echo.jp/shop_info/%E3%83%93%E3%83%83%E3%82%B0%E3%82%A8%E3%82%B3%E3%83%BC%E6%96%B0%E6%A8%AA%E6%B5%9C%E3%82%A2%E3%83%AA%E3%83%BC%E3%83%8A%E9%80%9A%E3%82%8A%E5%BA%97" }],
  ["ya-meet-royalhost", { area: "新横浜駅ビル（キュービックプラザ）", accessCondition: "6:30〜23:00", outsideViewIds: ["access"], url: "https://locations.royalhost.jp/detail/199597/" }],
  ["ya-meet-cubic-restaurants", { area: "新横浜駅ビル（キュービックプラザ）", accessCondition: "11:00〜23:00・店ごとに違う", outsideViewIds: ["access"], url: "https://www.cubicplaza.com/business-hours/guide/restaurant" }],
  ["ya-meet-sukiya", { area: near, accessCondition: "4:00〜翌3:00", outsideViewIds: ["access"], url: "https://maps.sukiya.jp/jp/detail/1029.html" }],
  ["ya-meet-cotedazur", { area: "新横浜駅寄り・新横浜3丁目", accessCondition: "9:00〜翌5:00・最大24人", outsideViewIds: ["access"], url: "https://www.cotedazur.jp/branch/detail/10116.html" }],
  ["ya-meet-kaikatsu", { area: "新横浜駅寄り・新横浜2丁目", accessCondition: "イベント期間は特別料金", outsideViewIds: ["access"], url: "https://www.kaikatsu.jp/shop/detail/20901.html" }],
  ["ya-meet-park-ekimae", { area: "新横浜駅寄り・鳥山川沿い", accessCondition: "公園・トイレあり", outsideViewIds: ["access"], url: "https://www.city.yokohama.lg.jp/kohoku/kurashi/machizukuri_kankyo/jimusho/koen_ryokudo/map-seach/c-2/sinyokohamaekimae.html" }],
  ["ya-parking-prince", { area: "会場周辺・新横浜3丁目（プリンスペペ）", accessCondition: "24時間・2027年3月31日まで", outsideViewIds: ["access"], url: times("BUK0020979") }],
]);
