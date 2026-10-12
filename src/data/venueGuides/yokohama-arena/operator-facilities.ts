import type { FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { GuideFacility, GuideSource } from "../types";

const lockerSearch = "https://multiecube.com/?q=%E6%96%B0%E6%A8%AA%E6%B5%9C";
const jrGuide = "https://media.jreast.co.jp/articles/6278";
export const yokohamaOperatorSources: GuideSource[] = [
  { id: "ya-jr-locker-locations", title: "JR東日本・新横浜駅のロッカー", url: jrGuide, checkedAt: "2026-10-07", scope: "ホーム/篠原口/市営地下鉄出口3のマルチエキューブ、既存JR改札内階段下、市営地下鉄9出入口付近206台を区別。記事は2026年7月情報。写真から精密ピンを作らない。", usage: "facts-only" },
  { id: "ya-multi-current", title: "マルチエキューブ・新横浜の検索と個別詳細", url: lockerSearch, checkedAt: "2026-10-07", scope: "現行公開検索と3個別詳細で設置区域・改札境界・初電〜終電・当日利用料/予約料を確認。空き台数を固定掲載しない。リンク先は新横浜の3区域を選ぶ運営サイト。", usage: "facts-only" },
  { id: "ya-multi-use", title: "マルチエキューブ・利用方法", url: "https://multiecube.com/how-to-use/", checkedAt: "2026-10-07", scope: "WEB予約は会員登録とカード決済、通常の取出し後は再預入れ不可。窓口受付時間をロッカー営業時間として転用しない。", usage: "facts-only" },
  { id: "ya-familymart-operator", title: "ファミリーマート・新横浜三丁目店", url: "https://store.family.co.jp/points/58482", checkedAt: "2026-10-07", scope: "現行店舗ページの名称・住所・24時間営業。未掲載の機器/入口位置は補わない。", usage: "facts-only" },
  { id: "ya-accea-cafe-operator", title: "アクセアカフェ・新横浜店", url: "https://cafe.accea.co.jp/map/shinyokohama.php", checkedAt: "2026-10-07", scope: "パリスコート1F、平日9〜20時/土日祝10〜19時、有料30分利用・BizSPOT入退室、フリードリンクと軽食。商品受取専用設備を荷物預かりとして登録しない。", usage: "facts-only" },
];
const multiConditions = "初電から終電まで。通常の当日利用料はS500円・M600円・L800円、WEB予約は別途500円の予約料がかかります。会員プラン・利用日による条件は予約画面で確認してください。WEB予約には会員登録とカード決済が必要です。通常の預け入れは取り出すと終了し、同じ利用のまま再び預けられません。";
const storage = [
  { id: "ya-multi-platform", name: "マルチエキューブ・横浜線ホーム", floor: "駅ホーム", location: "JR新横浜駅・5/6番線ホーム東神奈川方（改札内）", detail: `${multiConditions}他路線から利用する場合はJRへの入場が必要です。`, area: "新横浜駅・JR改札内", accessCondition: "JR横浜線 改札内・取り出し時も入場が必要" },
  { id: "ya-multi-shinohara", name: "マルチエキューブ・篠原口", floor: "駅構内", location: "JR新横浜駅・篠原口改札外の階段下", detail: `${multiConditions}横浜アリーナのある北口とは逆側です。`, area: "新横浜駅・篠原口", accessCondition: "篠原口 改札外・初電から終電まで" },
  { id: "ya-multi-subway", name: "マルチエキューブ・地下鉄出口3付近", floor: "駅構内", location: "市営地下鉄新横浜駅・JR方面改札外の出口3連絡通路", detail: `SSサイズは当日利用料300円です。${multiConditions}`, area: "新横浜駅・市営地下鉄", accessCondition: "市営地下鉄 改札外・初電から終電まで" },
];
export const yokohamaOperatorFacilities: GuideFacility[] = [
  ...storage.map(item => ({ id: item.id, name: item.name, floor: item.floor, location: item.location, detail: item.detail, sourceIds: ["ya-jr-locker-locations", "ya-multi-current", "ya-multi-use"], purpose: "荷物" as const, kind: "locker", scope: "場外" as const, precision: "text-only" as const, storageKind: "coin" as const, bookingUrl: lockerSearch })),
  { id: "ya-blue-exit9-locker", name: "市営地下鉄・9出入口付近ロッカー", floor: "駅構内", location: "新横浜駅・市営地下鉄9出入口付近", detail: "小・中・大の206台の設置案内があります。料金・決済方法・利用時間は利用する機器の表示をご確認ください。", sourceIds: ["ya-jr-locker-locations"], purpose: "荷物", kind: "locker", scope: "場外", precision: "text-only", storageKind: "coin" },
  { id: "ya-familymart-shinyokohama3", name: "ファミリーマート 新横浜三丁目店", floor: "周辺店舗", location: "新横浜3-17-11", detail: "24時間営業のコンビニです。会場の外で飲み物や食べ物を購入できます。店内設備や入場口までの経路は店舗・公演の案内をご確認ください。", sourceIds: ["ya-familymart-operator"], purpose: "飲食", kind: "convenience-store", scope: "場外", precision: "text-only" },
  { id: "ya-accea-cafe", name: "アクセアカフェ 新横浜店", floor: "店舗1F", location: "新横浜3-20-16・パリスコート1F", detail: "有料のコワーキングカフェです。平日9:00〜20:00、土日祝10:00〜19:00。30分から利用でき、通常料金396円（税込）、アプリ決済242円（税込）。フリードリンク・軽食自販機があります。BizSPOTアプリと登録したカードで入退室・決済します。個室ブースは別途予約制です。", sourceIds: ["ya-accea-cafe-operator"], purpose: "飲食", kind: "cafe", scope: "場外", precision: "text-only" },
];
export const yokohamaOperatorMeta: Record<string, FacilityMeta> = Object.fromEntries([
  ...storage.map(item => [item.id, { area: item.area, accessCondition: item.accessCondition, outsideViewIds: ["access"], url: lockerSearch }]),
  ["ya-blue-exit9-locker", { area: "新横浜駅・市営地下鉄", accessCondition: "9出入口付近・駅の案内と機器表示を確認", outsideViewIds: ["access"], url: jrGuide }],
  ["ya-familymart-shinyokohama3", { name: "ファミリーマート 新横浜三丁目店 / FamilyMart", area: "会場周辺・新横浜3丁目", accessCondition: "会場入場前に利用可・24時間営業", outsideViewIds: ["access"], url: "https://store.family.co.jp/points/58482" }],
  ["ya-accea-cafe", { name: "アクセアカフェ 新横浜店 / ACCEA CAFE", area: "会場周辺・新横浜3丁目", accessCondition: "有料利用・BizSPOTアプリで入退室", outsideViewIds: ["access"], url: "https://cafe.accea.co.jp/map/shinyokohama.php" }],
]);
