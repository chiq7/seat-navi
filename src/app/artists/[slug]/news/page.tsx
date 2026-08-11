"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { findArtistBySlug } from "@/lib/artists";
import { getOfficialNewsSummary, queryAllOfficialNewsForArtist } from "@/lib/officialNews";
import type { OfficialNews, OfficialNewsCategory } from "@/lib/types";
import { OFFICIAL_NEWS_CATEGORY_LABELS } from "@/lib/types";
import { Header } from "@/components/common/Header";
import { BottomNav } from "@/components/common/BottomNav";

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
    <main className="community-page pb-20 font-sans">
      <section className="community-hero">
        <Header title="公式ニュース" backHref={`/artists/${slug}`} backLabel={`${artist.name}へ戻る`} />
        <div className="zr-container pb-10 pt-5 sm:pb-14 sm:pt-9">
          <Newspaper size={28} strokeWidth={1.6} className="text-[#ef4f87]" aria-hidden="true" />
          <p className="community-eyebrow mt-6">OFFICIAL NEWS</p>
          <h1 className="community-title mt-3">{artist.name}の、<br /><span className="text-[#ef4f87]">公式ニュース。</span></h1>
          <p className="community-subtitle mt-5 max-w-xl">出演情報、リリース、ライブのお知らせを公式サイトからまとめています。</p>
        </div>
      </section>

      <section className="zr-container py-9 sm:py-14" aria-labelledby="official-news-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="artist-kicker">Artist Journal</p>
            <h2 id="official-news-title" className="artist-heading">最新情報</h2>
          </div>
          <p className="text-[10px] font-black text-[#817981]">{filteredNews.length} ARTICLES</p>
        </div>

        {categoryOptions.length > 0 && (
        <label className="community-panel mt-7 block p-4">
            <span className="mb-2 block text-[9px] font-black tracking-[0.2em] text-[#817981]">CATEGORY</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as "all" | OfficialNewsCategory)}
              className="zr-focus h-11 w-full border-0 bg-transparent text-[13px] font-black text-[#1c171b] outline-none"
            >
              <option value="all">すべてのニュース</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{OFFICIAL_NEWS_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center" aria-label="読み込み中">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f43679] border-t-transparent" />
          </div>
        ) : filteredNews.length === 0 ? (
          <p className="community-panel py-14 text-center text-sm font-bold text-[#817981]">公式ニュースはまだありません</p>
        ) : (
          <div className="mt-7 grid gap-3">
            {filteredNews.map((n) => (
              <a
                key={n.id}
                href={n.article_url}
                target="_blank"
                rel="noopener noreferrer"
                  className="community-card zr-focus group grid min-h-44 grid-cols-[72px_1fr] gap-4 p-5 no-underline transition-colors hover:bg-white sm:grid-cols-[110px_1fr_auto] sm:items-center"
                aria-label={`${n.article_title}を公式サイトで読む`}
              >
                <div className="self-start">
                  <time dateTime={n.published_date ?? undefined} className="block text-[10px] font-black tracking-[0.04em] text-[#817981]">
                    {n.published_date ? fmtPublishedDate(n.published_date) : "DATE TBA"}
                  </time>
                  {n.category && <span className="mt-2 block text-[9px] font-black text-[#f43679]">{OFFICIAL_NEWS_CATEGORY_LABELS[n.category]}</span>}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-black leading-[1.55] tracking-[-0.025em] text-[#1c171b] sm:text-[18px]">{n.article_title}</h3>
                  <p className="mt-2 line-clamp-3 text-[12px] font-medium leading-6 text-[#817981]">{getOfficialNewsSummary(n)}</p>
                  <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[11px] font-black text-[#f43679] sm:hidden">公式サイトで読む<ExternalLink size={14} aria-hidden="true" /></span>
                </div>
                <span className="hidden min-h-11 items-center gap-2 text-[11px] font-black text-[#f43679] sm:inline-flex">公式サイトで読む<ExternalLink size={15} aria-hidden="true" /></span>
              </a>
            ))}
          </div>
        )}
      </section>

      <BottomNav active="artist" artistSlug={slug} />
    </main>
  );
}
