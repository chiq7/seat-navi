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
    <section className="mt-3 px-3" id="official-news">
      <h2 className="mb-3 text-[18px] font-bold leading-none text-gray-900">公式ニュース</h2>
      <div className="rounded-[24px] border border-pink-100 bg-white p-3 shadow-sm">
        <div className="overflow-hidden rounded-xl border border-gray-100">
          {news.map((n) => (
            <a
              key={n.id}
              href={n.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 no-underline last:border-b-0 active:bg-gray-50"
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
        <div className="mt-3 flex justify-center">
          <Link href={moreHref} className="inline-flex items-center text-[14px] font-bold text-[#FF6B9D]">
            もっと見る
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
