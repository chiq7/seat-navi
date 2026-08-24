export const REPORT_TONES = ["ticket", "seat", "live", "setlist"] as const;

export type ReportTone = (typeof REPORT_TONES)[number];

/**
 * レポート種別の色はこの対応を唯一の基準にする。
 * Tailwindが静的に検出できるよう、クラス名は完成形で列挙する。
 */
export const REPORT_TONE_CLASSES: Record<
  ReportTone,
  { text: string; background: string; border: string }
> = {
  ticket: {
    text: "text-ticket",
    background: "bg-ticket-soft",
    border: "border-ticket",
  },
  seat: {
    text: "text-seat",
    background: "bg-seat-soft",
    border: "border-seat",
  },
  live: {
    text: "text-live",
    background: "bg-live-soft",
    border: "border-live",
  },
  setlist: {
    text: "text-setlist",
    background: "bg-setlist-soft",
    border: "border-setlist",
  },
};
