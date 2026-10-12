import type { EventDaySummary } from "@/lib/eventDaySummary";

/** 2026-09-29 primary-source review. See docs/event-day-summary-design.md. */
export const EVENT_DAY_OSAKA_EXAMPLE: EventDaySummary = {
  id: "stray-kids-osaka-20260919", artist: "Stray Kids", tour: "RUN IT JAPAN",
  venue: "京セラドーム大阪", venueSlug: "kyocera-dome", date: "2026-09-19",
  eventHref: "/events/93dec1e9b401d54ac03e",
  dateLabel: "2026.9.19（土）", state: "past-example", open: "16:30", start: "18:30", scheduleSourceId: "schedule",
  venueMapId: "kyocera-dome-outside", hashtags: ["#StrayKids", "#スキズ", "#RUN_IT", "#RUN_IT_JAPAN"],
  booths: [
    { id: "goods", kind: "goods", number: 1, label: "グッズ", hours: "9:00–19:00", floor: "1F", place: "バス乗降所", color: "#aa2f66", conditions: [], preparation: [], sourceIds: ["goods", "map"], map: { venueMapId: "kyocera-dome-outside", x: .74, y: .91, status: "reconstructed", sourceId: "map" } },
    { id: "cd", kind: "cd", number: 2, label: "CD予約", hours: "9:00–19:00", floor: "2F", place: "中央プラザ側", color: "#356481", conditions: [], preparation: [], sourceIds: ["cd", "map"], map: { venueMapId: "kyocera-dome-outside", x: .57, y: .82, status: "reconstructed", sourceId: "map" } },
    { id: "fc-lottery", kind: "fc-lottery", number: 3, label: "FCくじ", hours: "9:00–18:30", floor: "2F", place: "東口 B-SITE", color: "#227264", conditions: ["FC会員限定"], preparation: ["FC会員ページ"], sourceIds: ["fc", "map"], map: { venueMapId: "kyocera-dome-outside", x: .55, y: .14, status: "reconstructed", sourceId: "map" } },
    { id: "fc-benefits", kind: "fc-benefits", number: 4, label: "FC引換", hours: "9:00–18:30", floor: "2F", place: "BSQUARE", color: "#227264", conditions: ["くじ当選者／MILE特典の対象会員"], preparation: ["MILE特典はマイページ提示・スクショ不可"], sourceIds: ["fc", "map"], map: { venueMapId: "kyocera-dome-outside", x: .24, y: .68, status: "reconstructed", sourceId: "map" } },
  ],
  remoteActions: [
    { id: "check-in", kind: "check-in", label: "チェックイン", hours: null, place: "会場周辺", conditions: ["FC会員"], preparation: ["会員ページ・位置情報ON"], sourceIds: ["fc"] },
    { id: "member-lottery", kind: "member-lottery", label: "W会員抽選", hours: "9:00–16:30", place: "会場周辺", conditions: ["両FCの会員"], preparation: ["会員ページ・位置情報ON"], sourceIds: ["fc", "schedule"] },
  ],
  deadlines: [
    { id: "member-draw-end", actionId: "member-lottery", kind: "lottery", label: "W会員抽選", time: "16:30", note: "会場周辺・位置情報ON", sourceIds: ["fc", "schedule"], derived: true },
    { id: "cd-exchange-end", actionId: "cd", kind: "exchange", label: "CD当選引換", time: "18:00", note: "CDブースの引換窓口", sourceIds: ["cd", "schedule"], derived: true },
    { id: "fc-exchange-end", actionId: "fc-benefits", kind: "exchange", label: "FC特典引換", time: "18:30", note: "くじ景品・MILE特典", sourceIds: ["fc", "schedule"], derived: true },
  ],
  activities: [
    { id: "check-in-benefit", actionId: "check-in", kind: "check-in", label: "チェックイン", detail: "30MILE ＋ 公演限定アイコン", sourceIds: ["fc"] },
    { id: "fc-lottery-price", actionId: "fc-lottery", kind: "fc-lottery", label: "FCくじ", detail: "FC会員限定・1回550円", sourceIds: ["fc"] },
    { id: "cd-benefit", actionId: "cd", kind: "cd", label: "CD予約特典", detail: "日替わりトレカ ＋ スクラッチ", sourceIds: ["cd"] },
  ],
  reminders: [
    { id: "goods-caution", actionIds: ["goods"], kind: "goods", label: "グッズは終演後なし", detail: "VER.2ペンライトの販売もなし", sourceIds: ["goods"] },
    { id: "member-page", actionIds: ["member-lottery"], kind: "member-lottery", label: "会員ページを事前に開く", detail: "W抽選の当選受付はスクショ不可", sourceIds: ["fc"] },
    { id: "member-reception", actionIds: ["member-lottery"], kind: "member-lottery", label: "当選者受付は18:30まで", detail: "FCブースへ。会員ページを表示", sourceIds: ["fc", "schedule"] },
    { id: "cd-delivery", actionIds: ["cd"], kind: "cd", label: "CDは配送のみ", detail: "送料900円・現地で商品受取なし", sourceIds: ["cd"] },
  ],
  sources: [
    { id: "schedule", title: "公演日・開場／開演", url: "https://www.sonymusic.co.jp/artist/StrayKids/info/585866", checkedAt: "2026-09-29" },
    { id: "goods", title: "大阪グッズ販売案内", url: "https://www.sonymusic.co.jp/artist/StrayKids/info/586866", checkedAt: "2026-09-29" },
    { id: "cd", title: "CD予約特典・当選引換", url: "https://www.sonymusic.co.jp/artist/StrayKids/info/586256", checkedAt: "2026-09-29" },
    { id: "fc", title: "FCくじ・W会員抽選・MILE", url: "https://skz-stayjapan.com/RUNIT_JAPAN/", checkedAt: "2026-09-29" },
    { id: "map", title: "大阪公演ブース配置", url: "https://skz-stayjapan.com/s/n104/news/detail/13214", checkedAt: "2026-09-29" },
  ],
};
