import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { OFFICIAL_NEWS_CATEGORY_LABELS, type OfficialNews } from "@/lib/types";

/** 表示可否はアーティスト登録だけで決まり、crawler対応slugの別allowlistは持たない。 */
export function isOfficialNewsArtist(artistSlug: string): boolean {
  return findArtistBySlug(artistSlug) != null;
}

// The public view is the database-level security boundary. The base table is not selectable by
// anon/authenticated, and article_body is not a column of this view.
const OFFICIAL_NEWS_COLUMNS =
  "id, artist_slug, article_title, article_url, published_date, thumbnail_url, category, is_event_candidate, event_name, tour_name, event_dates, venue_names, ticket_sale_start, ticket_sale_end, confidence, needs_review, review_reason, fetched_at, created_at";

export type OfficialNewsQueryResult = {
  data: OfficialNews[];
  error: boolean;
};

export function sortOfficialNewsForDisplay(news: readonly OfficialNews[]): OfficialNews[] {
  return [...news].sort((a, b) =>
    (b.published_date ?? "").localeCompare(a.published_date ?? "") ||
    (b.created_at ?? "").localeCompare(a.created_at ?? "") ||
    a.id.localeCompare(b.id),
  );
}

export function buildOfficialNewsCollections(news: readonly OfficialNews[]) {
  const all = sortOfficialNewsForDisplay(news);
  return { top: all.slice(0, 3), all };
}

export async function queryLatestOfficialNewsForArtist(
  artistSlug: string,
  limit = 3,
): Promise<OfficialNewsQueryResult> {
  if (!isOfficialNewsArtist(artistSlug)) return { data: [], error: false };

  const { data, error } = await supabase
    .from("official_news_public")
    .select(OFFICIAL_NEWS_COLUMNS)
    .eq("artist_slug", artistSlug)
    .order("published_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logOfficialNewsQueryError("latest", artistSlug, error);
    return { data: [], error: true };
  }
  return { data: sortOfficialNewsForDisplay((data as OfficialNews[]) ?? []), error: false };
}

/** アーティストページの「公式NEWS」セクション用: 新しい順に最新N件。 */
export async function getLatestOfficialNewsForArtist(
  artistSlug: string,
  limit = 3,
): Promise<OfficialNews[]> {
  return (await queryLatestOfficialNewsForArtist(artistSlug, limit)).data;
}

export async function queryAllOfficialNewsForArtist(
  artistSlug: string,
): Promise<OfficialNewsQueryResult> {
  if (!isOfficialNewsArtist(artistSlug)) return { data: [], error: false };

  const { data, error } = await supabase
    .from("official_news_public")
    .select(OFFICIAL_NEWS_COLUMNS)
    .eq("artist_slug", artistSlug)
    .order("published_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    logOfficialNewsQueryError("all", artistSlug, error);
    return { data: [], error: true };
  }
  return { data: sortOfficialNewsForDisplay((data as OfficialNews[]) ?? []), error: false };
}

/** アーティスト別NEWS一覧ページ用: 全件を新しい順に取得(カテゴリ絞り込みはクライアント側で行う)。 */
export async function getAllOfficialNewsForArtist(artistSlug: string): Promise<OfficialNews[]> {
  return (await queryAllOfficialNewsForArtist(artistSlug)).data;
}

/** article_bodyを使わず、公開viewの分類済みメタデータだけで一覧用の概要を作る。 */
export function getOfficialNewsSummary(news: OfficialNews): string {
  const parts: string[] = [];
  const subject = news.event_name ?? news.tour_name;

  if (subject) {
    parts.push(`${subject}に関する公式のお知らせ`);
  } else if (news.category) {
    parts.push(`${OFFICIAL_NEWS_CATEGORY_LABELS[news.category]}に関する公式のお知らせ`);
  } else {
    parts.push("公式サイトからのお知らせ");
  }

  if ((news.event_dates ?? []).length > 0) {
    parts.push(`開催日: ${news.event_dates.slice(0, 2).join("、")}`);
  }
  if ((news.venue_names ?? []).length > 0) {
    parts.push(`会場: ${news.venue_names.slice(0, 2).join("、")}`);
  }
  if (news.ticket_sale_start || news.ticket_sale_end) {
    const range = [news.ticket_sale_start, news.ticket_sale_end].filter(Boolean).join("〜");
    parts.push(`受付: ${range}`);
  }

  return parts.join(" / ");
}

type SafeSupabaseError = {
  code?: string;
  message?: string;
  hint?: string;
};

function logOfficialNewsQueryError(
  query: "latest" | "all",
  artistSlug: string,
  error: SafeSupabaseError,
): void {
  // Keep this server-side diagnostic intentionally small: no query result, article body,
  // credentials, request headers, or Supabase connection details are included.
  console.error("[official-news] public NEWS query failed; check migration 031 and view grants", {
    query,
    artistSlug,
    code: error.code ?? "unknown",
    message: error.message ?? "Supabase returned an unspecified error",
    hint: error.hint ?? undefined,
  });
}
