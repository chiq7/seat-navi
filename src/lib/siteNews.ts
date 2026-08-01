export type SiteNewsPost = {
  slug: string;
  category: string;
  publishedAt: string;
  title: string;
  summary: string;
};

/**
 * ちけレポ運営による告知。アーティスト公式NEWSとは用途・取得元を分離する。
 * 新しい告知はこの配列へ追加し、TOPと /news に同じ情報を表示する。
 */
export const SITE_NEWS: readonly SiteNewsPost[] = [
  {
    slug: "tixrepo-molkky-2026",
    category: "ちけレポ主催イベント",
    publishedAt: "2026-08-01",
    title: "モルック初心者交流大会を開催します",
    summary:
      "ちけレポ開設記念・スポーツ体験イベント第1弾。2026年12月1日、駒沢オリンピック公園で開催します。",
  },
] as const;

export function getSiteNewsPost(slug: string): SiteNewsPost | undefined {
  return SITE_NEWS.find((post) => post.slug === slug);
}

export function formatSiteNewsDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}
