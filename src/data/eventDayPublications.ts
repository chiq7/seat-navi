import { EVENT_DAY_OSAKA_EXAMPLE } from "./eventDayOsakaExample";
import type { EventDayPublication } from "@/lib/eventDayPublication";
import type { EventDaySummary } from "@/lib/eventDaySummary";

/** This is a reviewed historical show, not a template for the next date/venue. */
const OSAKA_20260919: EventDaySummary = {
  ...EVENT_DAY_OSAKA_EXAMPLE,
  state: "past",
  booths: EVENT_DAY_OSAKA_EXAMPLE.booths.map(booth => {
    if (booth.id === "cd") return { ...booth, preparation: ["当選引換：A・B賞の当選スクラッチくじ"] };
    if (booth.id === "fc-lottery") return { ...booth, preparation: ["FC会員証またはマイページ"] };
    if (booth.id === "fc-benefits") return { ...booth,
      conditions: ["くじ当選者／MILE特典の対象会員", "STAY JAPAN GOLD 10,000MILE以上：フォトカード", "STAY JAPAN SILVER・GOLD 5,000MILE以上：ピクチャーチケット"],
      preparation: ["MILE特典：STAY JAPANのマイページ", "ピクチャーチケットの引換はスクショ不可", "Premium・A賞：当選くじと指定の顔写真付き身分証1点"],
    };
    return { ...booth };
  }),
  remoteActions: EVENT_DAY_OSAKA_EXAMPLE.remoteActions.map(action => action.id === "member-lottery"
    ? { ...action, preparation: ["会員ページ・位置情報ON", "当選受付：抽選結果画面と指定の顔写真付き身分証1点"] }
    : { ...action }),
  reminders: [
    ...EVENT_DAY_OSAKA_EXAMPLE.reminders,
    { id: "mile-limit", actionIds: ["fc-benefits"], kind: "fc-benefits", label: "MILE特典は各1回", detail: "各特典は9/5以降の公演を通して1人1回", sourceIds: ["fc"] },
    { id: "winner-identity", actionIds: ["fc-benefits", "member-lottery"], kind: "other", label: "当選者の本人確認", detail: "Premium・A賞／W抽選の当選者は、FC登録情報と身分証の情報が一致すること。指定身分証は公式案内を確認", sourceIds: ["fc"] },
  ],
  sources: EVENT_DAY_OSAKA_EXAMPLE.sources.map(source => ({ ...source,
    url: source.id === "map" ? "https://skz-stayjapan.com/RUNIT_JAPAN/" : source.url,
    checkedAt: "2026-09-30",
  })),
};

/** Public routes consume only published records through matchPublishedEventDay. */
export const EVENT_DAY_PUBLICATIONS: readonly EventDayPublication[] = [{
  status: "published",
  identity: {
    eventId: "93dec1e9b401d54ac03e", artistSlug: "stray-kids", artistName: "Stray Kids", date: "2026-09-19",
    venueId: "kyocera-dome", eventTitle: "Stray Kids World Tour 〈 RUN IT JAPAN 〉",
  },
  review: {
    reviewedAt: "2026-09-30",
    sourceUrls: [...new Set(OSAKA_20260919.sources.map(source => source.url))],
    notes: [
      "公開公式本文で日付・開場／開演・販売・引換・対象条件を再照合。CD引換は開演30分前、FC引換・当選受付は開演まで、W抽選は開場までを換算。",
      "配置はFC公開特設の https://skz-stayjapan.com/files/4/n104/contents/tour_runitjapan/assets/img/map/map_3_Ik9d.jpg を視認。独自位置関係図の再構成座標であり、実測値や歩行経路ではない。",
      "MILEの2特典・対象ランク・数字・9/5以降各1回、Premium/A賞およびW当選の本人確認を公開本文で照合。W参加用URL／2次元コードは転載しない。",
      "照合開始時、Stray KidsのNEWSはDBに0件。取得方式を公式安定JSONPへ更新し20件の取得を確認したが、今回の公開事実は一次資料の手動照合であり、NEWSのDB保存や自動公開済みとは扱わない。",
    ],
  },
  summary: OSAKA_20260919,
}];
