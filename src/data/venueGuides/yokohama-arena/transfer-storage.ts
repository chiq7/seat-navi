import type { FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { GuideFacility, GuideSource } from "../types";

export const yokohamaTransferSources: GuideSource[] = [
  { id: "ya-kikuna-locker", title: "東急・菊名駅ロッカー", url: "https://www.tokyu.co.jp/area/kikuna/station/coin-locker/", checkedAt: "2026-10-07", scope: "2F改札内トイレ脇、小型26台、交通系ICのみ。JR側や改札外へ転用しない。", usage: "facts-only" },
  { id: "ya-yokohama-locker", title: "東急・横浜駅ロッカー", url: "https://www.tokyu.co.jp/area/yokohama/station/coin-locker/", checkedAt: "2026-10-07", scope: "B3F正面改札外と南口B2F/B3Fを別項目。正面側はICのみ・小型18/大型2/特大型2。南口は別運営者で支払い/料金/時間を転用しない。", usage: "facts-only" },
  { id: "ya-tokyu-locker-rules", title: "東急・ロッカーの利用条件", url: "https://www.tokyu.co.jp/railway/coin-locker/", checkedAt: "2026-10-07", scope: "東急運営ロッカーの始発〜終電、午前2時加算、原則3日以内と変動料金。小松商事/アルファ運営区域へ一律適用しない。", usage: "facts-only" },
];
const conditions = "交通系ICカードのみで、現金は使えません。始発から終電まで利用できます。午前2時を過ぎると1回分を加算、利用は原則3日以内です。料金は機器表示を確認してください。一部は変動料金です。";
const items = [
  { id: "ya-transfer-kikuna", name: "菊名駅・東急改札内ロッカー", floor: "駅2F", location: "東急東横線 菊名駅2F・改札内のトイレ脇", detail: `小型26台。${conditions}取り出すときも東急の改札内へ入る必要があります。JR横浜線の改札内ロッカーとは別です。`, sourceIds: ["ya-kikuna-locker", "ya-tokyu-locker-rules"], area: "乗換駅・菊名", accessCondition: "東急東横線 改札内・取り出し時も入場が必要", url: "https://www.tokyu.co.jp/area/kikuna/station/coin-locker/" },
  { id: "ya-transfer-yokohama-front", name: "横浜駅・正面改札外ICロッカー", floor: "駅B3F", location: "東急東横線 横浜駅B3F・正面改札脇（改札外）", detail: `東急の案内に掲載されたIC式の区域です。小型18台・大型2台・特大型2台。${conditions}JR・相鉄の設備とは別の区域です。`, sourceIds: ["ya-yokohama-locker", "ya-tokyu-locker-rules"], area: "乗換駅・横浜", accessCondition: "東急東横線 正面改札外・駅の利用時間内", url: "https://www.tokyu.co.jp/area/yokohama/station/coin-locker/" },
  ...["B2F", "B3F"].map(floor => ({ id: `ya-transfer-yokohama-south-${floor}`, name: `横浜駅・南口${floor}ロッカー`, floor: `駅${floor}`, location: `東急東横線 横浜駅南口${floor}・改札外`, detail: "アルファロッカーシステムの運営区域です。正面改札脇とは別の設備です。サイズ・料金・決済方法・取り出せる時間は機器表示と運営者の案内をご確認ください。", sourceIds: ["ya-yokohama-locker"], area: "乗換駅・横浜", accessCondition: "南口改札外・利用する機器の条件を確認", url: "https://www.tokyu.co.jp/area/yokohama/station/coin-locker/" })),
];
export const yokohamaTransferStorage: GuideFacility[] = items.map(item => ({ id: item.id, name: item.name, floor: item.floor, location: item.location, detail: item.detail, sourceIds: item.sourceIds,
  purpose: "荷物", kind: "locker", scope: "場外", precision: "text-only", storageKind: "coin" }));
export const yokohamaTransferMeta: Record<string, FacilityMeta> = Object.fromEntries(items.map(item => [item.id, { name: item.name, location: item.location, detail: item.detail,
  area: item.area, outsideViewIds: ["access"], accessCondition: item.accessCondition, url: item.url }]));
