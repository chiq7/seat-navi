"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { findArtistBySlug } from "@/lib/artists";
import { getOfficialNewsSummary, queryAllOfficialNewsForArtist } from "@/lib/officialNews";
import type { OfficialNews, OfficialNewsCategory } from "@/lib/types";
import { OFFICIAL_NEWS_CATEGORY_LABELS } from "@/lib/types";
import { BottomNav } from "@/components/common/BottomNav";
import { Header } from "@/components/common/Header";

function fmtPublishedDate(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${y}.${m}.${day}`;
}

export default function ArtistNewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [news, setNews] = useState<OfficialNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<"all" | OfficialNewsCategory>("all");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!artist) { setLoading(false); return; }
    let cancelled = false;
    queryAllOfficialNewsForArtist(artist.slug).then((result) => {
      if (!cancelled) {
        setNews(result.data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [artist]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const categoryOptions = useMemo(() => {
    const cats = new Set<OfficialNewsCategory>();
    for (const n of news) if (n.category) cats.add(n.category);
    return [...cats];
  }, [news]);

  const filteredNews = useMemo(() => {
    if (filterCategory === "all") return news;
    return news.filter((n) => n.category === filterCategory);
  }, [news, filterCategory]);

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8FB] pb-24 font-sans text-gray-900">
      <Header title={`${artist.name} 公式ニュース`} backHref={`/artists/${slug}`} />

      {categoryOptions.length > 0 && (
        <div className="px-3 py-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as "all" | OfficialNewsCategory)}
            className="w-full max-w-[160px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-gray-700"
          >
            <option value="all">すべて</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{OFFICIAL_NEWS_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
        </div>
      ) : filteredNews.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">公式ニュースはまだありません</p>
      ) : (
        <div className="px-3">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {filteredNews.map((n) => (
              <a
                key={n.id}
                href={n.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-b border-gray-100 px-4 py-4 no-underline last:border-b-0"
                aria-label={`${n.article_title}を公式サイトで読む`}
              >
                <div className="flex items-center gap-1.5">
                  {n.category && (
                    <span className="shrink-0 rounded-full bg-[#FFF1F6] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6B9D]">
                      {OFFICIAL_NEWS_CATEGORY_LABELS[n.category]}
                    </span>
                  )}
                  {n.published_date ? (
                    <time dateTime={n.published_date} className="shrink-0 text-[11px] text-gray-400">
                      {fmtPublishedDate(n.published_date)}
                    </time>
                  ) : (
                    <span className="shrink-0 text-[11px] text-gray-400">日付未定</span>
                  )}
                </div>
                <h2 className="mt-1.5 text-[14px] font-bold leading-snug text-gray-900">
                  {n.article_title}
                </h2>
                <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-gray-500">
                  {getOfficialNewsSummary(n)}
                </p>
                <span
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#FF6B9D]"
                >
                  公式サイトで読む
                  <ExternalLink size={13} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <BottomNav active="artist" artistSlug={slug} />
    </main>
  );
}
