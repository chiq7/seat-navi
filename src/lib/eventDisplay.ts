import { getPerformanceSessionMarker } from "@/lib/eventIdentity";
import { resolveArtist } from "@/lib/artists";

type DisplayEventRow = {
  id: string;
  title: string;
  date: string | null;
  venue_id?: string | null;
  artist_slug?: string | null;
};

function displayEventScore(event: DisplayEventRow): number {
  const japaneseChars = (event.title.match(/[ぁ-んァ-ヶ一-龠]/g) ?? []).length;
  return (event.artist_slug ? 10_000 : 0) + japaneseChars * 100 + event.title.length;
}

function normalizeComparableTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　「」『』“”‘’"'・･:：/_\-–—|【】()[\]（）]/g, "");
}

/**
 * 保存行を変更せず、画面上で同じ公演としてまとめてよい候補だけを判定する。
 * 回次が異なる行は必ず別扱いにし、アーティスト未設定行はタイトル包含時だけ統合する。
 */
export function areLikelySameDisplayedEvent(left: DisplayEventRow, right: DisplayEventRow): boolean {
  if (left.date !== right.date || left.venue_id !== right.venue_id) return false;
  const leftSession = getPerformanceSessionMarker(left.title);
  const rightSession = getPerformanceSessionMarker(right.title);
  if ((leftSession !== null || rightSession !== null) && leftSession !== rightSession) return false;

  const leftArtist = resolveArtist(left)?.slug ?? left.artist_slug ?? null;
  const rightArtist = resolveArtist(right)?.slug ?? right.artist_slug ?? null;
  const leftTitle = normalizeComparableTitle(left.title);
  const rightTitle = normalizeComparableTitle(right.title);
  const shorterTitle = leftTitle.length <= rightTitle.length ? leftTitle : rightTitle;
  const longerTitle = shorterTitle === leftTitle ? rightTitle : leftTitle;
  const titleContainsOther = shorterTitle.length >= 8 && longerTitle.includes(shorterTitle);

  if (!leftArtist || !rightArtist) return titleContainsOther;
  if (leftArtist !== rightArtist) return false;
  return true;
}

export function findDisplayedEventRepresentative<T extends DisplayEventRow>(
  events: readonly T[],
  target: DisplayEventRow,
): T | null {
  const group = events.filter((event) => areLikelySameDisplayedEvent(event, target));
  if (group.length === 0) return null;
  return group.reduce((best, event) => displayEventScore(event) > displayEventScore(best) ? event : best);
}

/**
 * 会場ページは1アーティスト・1日・1公演回を1件として扱う。
 * 日英タイトル等の重複は、アーティスト紐付け済み・日本語情報量が多い行を表示代表にする。
 * 昼夜・複数部・異なる開演時刻は別公演として残す。
 * DB行や既存URLは変更しない。
 */
export function dedupeVenueEventsForDisplay<T extends DisplayEventRow>(events: readonly T[]): T[] {
  const representatives: T[] = [];
  for (const event of events) {
    if (!event.date) {
      representatives.push(event);
      continue;
    }
    const index = representatives.findIndex((candidate) => areLikelySameDisplayedEvent(candidate, event));
    if (index < 0) {
      representatives.push(event);
    } else if (displayEventScore(event) > displayEventScore(representatives[index])) {
      representatives[index] = event;
    }
  }
  return representatives.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}
