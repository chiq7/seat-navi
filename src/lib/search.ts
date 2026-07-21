import { ARTISTS, type Artist } from "@/lib/artists";
import { keywordMatchesTitle } from "@/lib/keywordMatch";
import { isTestArtist, isTestEvent } from "@/lib/seoData";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";

/**
 * ILIKEパターン中で特殊な意味を持つ "%" "_" "\" をエスケープする。
 * ユーザー入力をそのままILIKEへ渡すと、入力中の%/_が意図しないワイルドカードとして
 * 働いてしまう(例: "50%OFF" の"%"がワイルドカード展開されてしまう)ため、
 * PostgresのLIKE/ILIKEデフォルトエスケープ文字"\"で無害化する。
 */
function escapeIlikePattern(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}

/**
 * アーティスト名・別名・keywordsをローカル(ARTISTS配列)で検索する。DBアクセスなし。
 * 誤爆防止はsearchEventsと同じkeywordMatchesTitleを再利用する(例: "IVE"で検索した際、
 * 名前に"DRIVE"を含む別アーティストへ誤って一致しないようにする)。
 */
export function searchArtists(query: string, limit = 20): Artist[] {
  const q = query.trim();
  if (q.length < 1) return [];

  return ARTISTS.filter((a) => !isTestArtist(a))
    .filter((a) => keywordMatchesTitle(q, a.name) || a.keywords.some((kw) => keywordMatchesTitle(q, kw)))
    .slice(0, limit);
}

// DB側ILIKEはあくまで候補を広く拾うための事前フィルタ。短い英数字クエリ(例: "IVE")は
// ILIKEだけだと無関係な語("LIVE TOUR"等)まで大量に拾うため、事前フィルタの件数上限は
// 表示件数(limit)より十分大きく取り、最終的な採否はkeywordMatchesTitleで確定させる。
const PREFETCH_CAP = 400;

/**
 * 公演名・会場名をDB(events)で検索する。
 * artist_slug が未設定のイベントも検索対象・表示対象に含める。
 *
 * 誤爆防止: findArtistByKeyword/getEventsForArtistと同じ keywordMatchesTitle
 * (src/lib/keywordMatch.ts) をそのまま再利用し、ロジックを重複実装しない。
 * DB側のILIKEはあくまで広い事前フィルタとして使い、短いASCII英数字クエリ
 * (例: "IVE" → "LIVE TOUR"に誤爆、"EXO" → "EXOFIRE"に誤爆、"INI" → "HAEINISM"に誤爆)
 * による無関係な結果は、title/venueそれぞれにkeywordMatchesTitleを適用して除外する。
 * 日本語や5文字を超える語はkeywordMatchesTitle内で従来通りの単純部分一致のまま。
 */
export async function searchEvents(query: string, limit = 30): Promise<CrawledEvent[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const escaped = escapeIlikePattern(q);
  const columns = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";
  const [{ data: byTitle, error: titleErr }, { data: byVenue, error: venueErr }] = await Promise.all([
    supabase
      .from("events")
      .select(columns)
      .ilike("title", `%${escaped}%`)
      .order("date", { ascending: false })
      .limit(PREFETCH_CAP),
    supabase
      .from("events")
      .select(columns)
      .ilike("venue", `%${escaped}%`)
      .order("date", { ascending: false })
      .limit(PREFETCH_CAP),
  ]);
  if (titleErr) console.error(titleErr);
  if (venueErr) console.error(venueErr);

  const merged = new Map<string, CrawledEvent>();
  for (const e of (byTitle as CrawledEvent[] | null) ?? []) merged.set(e.id, e);
  for (const e of (byVenue as CrawledEvent[] | null) ?? []) merged.set(e.id, e);

  return [...merged.values()]
    .filter((e) => keywordMatchesTitle(q, e.title) || keywordMatchesTitle(q, e.venue))
    .filter((e) => !isTestEvent(e))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, limit);
}
