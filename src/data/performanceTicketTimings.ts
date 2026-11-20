import type { CrawledEvent } from "@/lib/types";

export type TicketTiming = {
  eventId: string;
  eventDate: string;
  venueId: string;
  title: string;
  artistSlug?: string;
  aliases: readonly string[];
  scope: string;
  receive: { label: string; dateTime?: string };
  seat: { label: string; dateTime?: string };
  source: { url: string; name: string };
};

const daiceSource = { url: "https://da-ice.jp/news/detail.php?id=1136291", name: "Da-iCE公式のリセール・入場案内" };
const dreamSource = { url: "https://dreamfestival.jp/information/", name: "ドリフェス公式のGalaxy先行案内" };

export const performanceTicketTimings: readonly TicketTiming[] = [
  ...([
    ["ddc4ff8b65e43da66210", "2026-11-17", "2026-11-16", "11月16日（月）15:00"],
    ["17d312f257e80eea69ff", "2026-11-18", "2026-11-17", "11月17日（火）15:00"],
  ] as const).map(([eventId, eventDate, seatDate, seatLabel]) => ({
    eventId, eventDate, venueId: "tokyo-garden-theater", scope: "AnyPASS電子チケット",
    title: "Da-iCE DAY HALL PHASE 2026", artistSlug: "da-ice",
    aliases: [eventDate.endsWith("-17") ? "Side A" : "Side B"],
    receive: { label: "購入時の案内を確認。公式リセール購入分は購入後にマイイベントへ表示。" },
    seat: { label: seatLabel + "から", dateTime: seatDate + "T15:00:00+09:00" },
    source: daiceSource,
  })),
  ...([
    ["7b0b428671b7df145d9e", "2026-11-21"],
    ["d186d25b27b5b5ab9aab", "2026-11-22"],
    ["ab90e46d1d8128b36424", "2026-11-23"],
  ] as const).map(([eventId, eventDate]) => ({
    eventId, eventDate, venueId: "k-arena", scope: "Samsung Galaxyユーザー向け先行の購入分",
    title: "テレビ朝日ドリームフェスティバル2026", aliases: ["ドリフェス"],
    receive: { label: "11月20日（金）から受取URLをメールで案内", dateTime: "2026-11-20" },
    seat: { label: "表示開始日時は公式公開ページで確認できていません。" },
    source: dreamSource,
  })),
];

export function getPerformanceTicketTiming(event: Pick<CrawledEvent, "id" | "date" | "venue_id">): TicketTiming | undefined {
  return performanceTicketTimings.find(row => row.eventId === event.id && row.eventDate === event.date && row.venueId === event.venue_id);
}

