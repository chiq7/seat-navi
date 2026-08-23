import type { CrawledEvent } from "@/lib/types";
import { getPerformanceSessionMarker } from "@/lib/eventIdentity";

function displayEventScore(event: CrawledEvent): number {
  const japaneseChars = (event.title.match(/[ぁ-んァ-ヶ一-龠]/g) ?? []).length;
  return (event.artist_slug ? 10_000 : 0) + japaneseChars * 100 + event.title.length;
}

/**
 * 会場ページは1アーティスト・1日・1公演回を1件として扱う。
 * 日英タイトル等の重複は、アーティスト紐付け済み・日本語情報量が多い行を表示代表にする。
 * 昼夜・複数部・異なる開演時刻は別公演として残す。
 * DB行や既存URLは変更しない。
 */
export function dedupeVenueEventsForDisplay(events: readonly CrawledEvent[]): CrawledEvent[] {
  const byPerformance = new Map<string, CrawledEvent>();
  for (const event of events) {
    if (!event.date) {
      byPerformance.set(`undated:${event.id}`, event);
      continue;
    }
    const artistIdentity = event.artist_slug ?? `title:${event.title.normalize("NFKC").toLowerCase()}`;
    const session = getPerformanceSessionMarker(event.title) ?? "default";
    const key = `${event.date}::${artistIdentity}::${session}`;
    const current = byPerformance.get(key);
    if (!current || displayEventScore(event) > displayEventScore(current)) {
      byPerformance.set(key, event);
    }
  }
  return [...byPerformance.values()].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}
