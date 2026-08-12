"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import { findArtistBySlug } from "@/lib/artists";
import { getOfficialNewsSummary, queryAllOfficialNewsForArtist } from "@/lib/officialNews";
import type { OfficialNews, OfficialNewsCategory } from "@/lib/types";
import { OFFICIAL_NEWS_CATEGORY_LABELS } from "@/lib/types";
import { Header } from "@/components/common/Header";
import { SelectControl } from "@/components/common/SelectControl";
import { BottomNav } from "@/components/common/BottomNav";
import { InfoListRow } from "@/components/common/InfoListRow";

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
          <label className="mt-5 block max-w-[260px]">
            <span className="mb-1.5 block text-[9px] font-black tracking-[0.2em] text-[#817981]">CATEGORY</span>
            <SelectControl
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as "all" | OfficialNewsCategory)}
            >
              <option value="all">すべてのニュース</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{OFFICIAL_NEWS_CATEGORY_LABELS[c]}</option>
              ))}
            </SelectControl>
          </label>
        )}

        {loading ? (
          <div className="mt-7 space-y-3 border-t border-[#ded8dc] pt-3" aria-busy="true" aria-label="公式ニュースを読み込み中">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse border-b border-[#ece5e9] py-4">
                <div className="h-3 w-24 bg-[#f2e9ed]" />
                <div className="mt-3 h-4 w-3/4 bg-[#f8f3f5]" />
              </div>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <p className="community-panel py-14 text-center text-sm font-bold text-[#817981]">公式ニュースはまだありません</p>
        ) : (
          <div className="mt-7 border-t border-[#ded8dc]">
            {filteredNews.map((n) => (
              <InfoListRow
                key={n.id}
                href={n.article_url}
                external
                aria-label={`${n.article_title}を公式サイトで読む`}
              >
                <div className="self-start pt-0.5">
                  <time dateTime={n.published_date ?? undefined} className="block text-[10px] font-black tabular-nums text-[#817981]">
                    {n.published_date ? fmtPublishedDate(n.published_date) : "DATE TBA"}
                  </time>
                  {n.category && <span className="mt-1 block text-[9px] font-black text-[#f43679]">{OFFICIAL_NEWS_CATEGORY_LABELS[n.category]}</span>}
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-[14px] font-black leading-[1.45] tracking-[-0.025em] text-[#1c171b] sm:text-[16px]">{n.article_title}</h3>
                  <p className="mt-1 hidden truncate text-[11px] font-medium leading-5 text-[#817981] sm:block">{getOfficialNewsSummary(n)}</p>
                </div>
                <span className="flex min-h-11 items-center justify-end text-[#f43679]" aria-hidden="true"><ExternalLink size={15} /></span>
              </InfoListRow>
            ))}
          </div>
        )}
      </section>

      <BottomNav active="artist" artistSlug={slug} />
    </main>
  );
}
