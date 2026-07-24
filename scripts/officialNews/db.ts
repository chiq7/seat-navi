import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeOfficialNewsUrl } from "./urlIdentity.mjs";

type DbError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type OfficialNewsWriteRow = Record<string, unknown> & {
  artist_slug: string;
  article_url: string;
};

export function articleIdentityKey(artistSlug: string, articleUrl: string): string {
  return `${artistSlug}\u0000${normalizeOfficialNewsUrl(articleUrl)}`;
}

/** 既存記事数が少ないアーティストを初回backfillで優先するための件数集計。 */
export function countExistingArticlesByArtist(keys: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) {
    const separator = key.indexOf("\u0000");
    if (separator <= 0) continue;
    const artistSlug = key.slice(0, separator);
    counts.set(artistSlug, (counts.get(artistSlug) ?? 0) + 1);
  }
  return counts;
}

export function isPersistableAiStatus(status: string): status is "classified" {
  return status === "classified";
}

/** PostgreSQL text/jsonbが受け付けないNULを公式サイト由来文字列から除去する。 */
export function sanitizePostgresText(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.replace(/\u0000/g, "");
}

export async function loadExistingArticleKeys(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client
    .from("official_news")
    .select("artist_slug, normalized_article_url");

  if (error) {
    throw new Error(`official_news SELECT failed: ${formatDbError(error)}`);
  }

  const keys = new Set<string>();
  for (const row of data ?? []) {
    if (row.artist_slug && row.normalized_article_url) {
      keys.add(`${row.artist_slug}\u0000${row.normalized_article_url}`);
    }
  }
  return keys;
}

export async function upsertOfficialNewsArticle(
  client: SupabaseClient,
  row: OfficialNewsWriteRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await client
      .from("official_news")
      .upsert(row, { onConflict: "artist_slug,normalized_article_url" });

    if (error) return { ok: false, error: formatDbError(error) };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `upsert threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function formatDbError(error: DbError): string {
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" | ");
}
