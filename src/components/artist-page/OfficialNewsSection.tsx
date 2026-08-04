import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { OfficialNews } from "@/lib/types";
import { OFFICIAL_NEWS_CATEGORY_LABELS } from "@/lib/types";

type Props = {
  news: OfficialNews[];
  moreHref: string;
};

function fmtPublishedDate(d: string | null): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${y}.${m}.${day}`;
}

export default function OfficialNewsSection({ news, moreHref }: Props) {
  if (news.length === 0) return null;

  return (
    <section className="artist-section" id="official-news">
      <p className="artist-kicker">Official News</p>
      <h2 className="artist-heading">公式ニュース</h2>
      <div className="mt-6 border-t border-[#ded8dc]">
        <div>
          {news.map((n) => (
            <a
              key={n.id}
              href={n.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="zr-focus flex min-h-[92px] items-center gap-3 border-b border-[#ded8dc] py-3 no-underline transition-colors hover:bg-white sm:px-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {n.category && (
                    <span className="shrink-0 rounded-full bg-[#FFF1F6] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6B9D]">
                      {OFFICIAL_NEWS_CATEGORY_LABELS[n.category]}
                    </span>
                  )}
                  {n.published_date && (
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {fmtPublishedDate(n.published_date)}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900">
                  {n.article_title}
                </p>
              </div>
              <ExternalLink size={14} className="shrink-0 text-gray-300" aria-hidden="true" />
            </a>
          ))}
        </div>
        <div className="mt-5 flex justify-center">
          <Link href={moreHref} className="inline-flex items-center text-[14px] font-bold text-[#FF6B9D]">
            もっと見る
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
