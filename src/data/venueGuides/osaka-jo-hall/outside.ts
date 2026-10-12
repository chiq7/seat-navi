import type { GuideFacility, GuideSource } from "../types";
export const osakaOutsideSources: GuideSource[] = [
  { id: "osaka-jr-locker", title: "JR西日本・大阪城公園駅", url: "https://eki.jr-odekake.net/top?id=0610515", checkedAt: "2026-10-05", scope: "コインロッカー設置あり。個別の料金・改札内外は利用案内へ。", usage: "facts-only" },
  { id: "osaka-obp-locker", title: "Osaka Metro・大阪ビジネスパーク駅", url: "https://subway.osakametro.co.jp/station_guide/n/n21/", checkedAt: "2026-10-05", scope: "駅構内図のロッカー。個々の図座標は登録しない。", usage: "facts-only" },
];
export const osakaOutsideFacilities: GuideFacility[] = [
  { id: "osaka-locker-jr", name: "大阪城公園駅 コインロッカー", purpose: "荷物", floor: "駅構内", scope: "場外", location: "JR大阪環状線・大阪城公園駅", detail: "駅のコインロッカーを利用できます。料金・サイズ・改札内外は構内図と現地表示を確認してください。", sourceIds: ["osaka-jr-locker"], precision: "text-only", storageKind: "coin" },
  { id: "osaka-locker-obp", name: "大阪ビジネスパーク駅 コインロッカー", purpose: "荷物", floor: "駅構内", scope: "場外", location: "Osaka Metro 長堀鶴見緑地線・改札外、2〜4番出口方面", detail: "改札外のコインロッカーです。料金・サイズは現地表示を確認してください。", sourceIds: ["osaka-obp-locker"], precision: "text-only", storageKind: "coin" },
];
