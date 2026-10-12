import { getPerformanceSessionMarker } from "@/lib/eventIdentity";
import { resolveArtist } from "@/lib/artists";

type DisplayEventRow = {
  id: string;
  title: string;
  venue?: string;
  date: string | null;
  venue_id?: string | null;
  artist_slug?: string | null;
};

/**
 * 公式会場の同一日程で確認できた、保存行を残したまま表示だけまとめるIDペア。
 * 一般的な翻訳推測はせず、同一公演と確認した組だけを追加する。
 */
const CONFIRMED_DISPLAY_EVENT_ID_PAIRS = new Set([
  ["1cb62ee60e8d54da8f42", "89f39d35db8690821b32"].sort().join(":"),
  ["474d4e7584278325fc6c", "64e19896a8fb89446828"].sort().join(":"),
]);

const CONFIRMED_ARTIST_TITLE_ALIASES: Readonly<Record<string, string>> = {
  ryusuzukazeitaru: "龍涼風至",
};

function isConfirmedDisplayEventPair(leftId: string, rightId: string): boolean {
  return CONFIRMED_DISPLAY_EVENT_ID_PAIRS.has([leftId, rightId].sort().join(":"));
}

function displayEventScore(event: DisplayEventRow): number {
  const japaneseChars = (event.title.match(/[ぁ-んァ-ヶ一-龠]/g) ?? []).length;
  return (event.artist_slug ? 10_000 : 0) + japaneseChars * 100 + event.title.length;
}

/** DBの返却順に左右されず、同じ入力集合なら常に同じ代表を選ぶ。 */
function compareDisplayRepresentative(left: DisplayEventRow, right: DisplayEventRow): number {
  const scoreDiff = displayEventScore(left) - displayEventScore(right);
  if (scoreDiff !== 0) return scoreDiff;

  const leftTitle = normalizeComparableTitle(left.title);
  const rightTitle = normalizeComparableTitle(right.title);
  if (leftTitle !== rightTitle) return leftTitle > rightTitle ? 1 : -1;
  if (left.id === right.id) return 0;
  return left.id > right.id ? 1 : -1;
}

function normalizeComparableTitle(value: string): string {
  const compact = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　「」『』“”‘’"'・･,，、:：/_\-–—|【】()[\]（）]/g, "");
  return Object.entries(CONFIRMED_ARTIST_TITLE_ALIASES).reduce(
    (title, [alias, canonical]) => title.replaceAll(alias, canonical),
    compact,
  );
}

/**
 * 保存行を変更せず、画面上で同じ公演としてまとめてよい候補だけを判定する。
 * 回次が異なる行は必ず別扱いにし、アーティスト未設定行はタイトル包含時だけ統合する。
 */
export function areLikelySameDisplayedEvent(left: DisplayEventRow, right: DisplayEventRow): boolean {
  if (left.date !== right.date) return false;
  if (left.venue_id && right.venue_id) {
    if (left.venue_id !== right.venue_id) return false;
  } else {
    const leftVenue = left.venue?.normalize("NFKC").replace(/\s+/g, "").toLowerCase() ?? "";
    const rightVenue = right.venue?.normalize("NFKC").replace(/\s+/g, "").toLowerCase() ?? "";
    if (!leftVenue || !rightVenue || leftVenue !== rightVenue) return false;
  }
  const leftSession = getPerformanceSessionMarker(left.title);
  const rightSession = getPerformanceSessionMarker(right.title);
  if ((leftSession !== null || rightSession !== null) && leftSession !== rightSession) return false;
  if (isConfirmedDisplayEventPair(left.id, right.id)) return true;

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
  return group.reduce((best, event) => compareDisplayRepresentative(event, best) > 0 ? event : best);
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
    } else if (compareDisplayRepresentative(event, representatives[index]) > 0) {
      representatives[index] = event;
    }
  }
  return representatives.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}
