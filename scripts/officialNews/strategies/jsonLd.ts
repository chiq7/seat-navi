// Tier1: JSON-LD (schema.org Article/NewsArticle) / OGP。
// 実務上、JSON-LDは一覧ページよりも詳細ページに付与されることが多いため、主に
// 「詳細ページの本文・日付・サムネイル補完」用途で使う(sitemap等、URLのみ分かる
// 戦略と組み合わせる)。一覧ページ側にItemList形式のJSON-LDがあれば一覧としても使える。
import type { CrawledArticle } from "../types";

type JsonLdArticle = {
  ["@type"]?: string | string[];
  headline?: string;
  datePublished?: string;
  dateModified?: string;
  articleBody?: string;
  image?: string | { url?: string } | (string | { url?: string })[];
  url?: string;
};

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      blocks.push(parsed);
    } catch {
      // 壊れたJSON-LDはスキップ(サイト側の実装不備であり、こちらでは補正しない)
    }
  }
  return blocks;
}

function isArticleType(t: unknown): boolean {
  if (typeof t === "string") return /article|newsarticle|blogposting/i.test(t);
  if (Array.isArray(t)) return t.some(isArticleType);
  return false;
}

function firstImageUrl(image: JsonLdArticle["image"]): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return firstImageUrl(image[0]);
  if (typeof image === "object" && "url" in image) return image.url ?? null;
  return null;
}

/** 詳細ページのJSON-LD(Article/NewsArticle)から本文・日付・サムネイルを抽出する。 */
export function extractArticleFromJsonLd(html: string): Partial<CrawledArticle> | null {
  for (const block of extractJsonLdBlocks(html)) {
    const candidates: JsonLdArticle[] = Array.isArray(block) ? (block as JsonLdArticle[]) : [block as JsonLdArticle];
    for (const c of candidates) {
      const graph = (c as { ["@graph"]?: JsonLdArticle[] })["@graph"];
      const pool = graph ?? [c];
      for (const item of pool) {
        if (!isArticleType(item["@type"])) continue;
        return {
          title: item.headline,
          published_date: item.datePublished ? item.datePublished.slice(0, 10) : null,
          body: item.articleBody ?? null,
          thumbnail_url: firstImageUrl(item.image),
        };
      }
    }
  }
  return null;
}

/** OGP(og:title/og:description/og:image)からの補完抽出(JSON-LDが無い場合のフォールバック)。 */
export function extractArticleFromOgp(html: string): Partial<CrawledArticle> | null {
  const titleM = /<meta property="og:title" content="([\s\S]*?)"/.exec(html);
  const descM = /<meta property="og:description" content="([\s\S]*?)"/.exec(html);
  const imgM = /<meta property="og:image" content="([\s\S]*?)"/.exec(html);
  if (!titleM && !descM) return null;
  return {
    title: titleM?.[1]?.trim(),
    body: descM?.[1]?.trim() ?? null,
    thumbnail_url: imgM?.[1] ?? null,
    published_date: null,
  };
}
