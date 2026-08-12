import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { OfficialNews } from "@/lib/types";
import { OFFICIAL_NEWS_CATEGORY_LABELS } from "@/lib/types";
import { InfoListRow } from "@/components/common/InfoListRow";

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
            <InfoListRow
              key={n.id}
              href={n.article_url}
              external
              ariaLabel={`${n.article_title}を公式サイトで読む`}
            >
              <div className="self-start pt-0.5">
                <time dateTime={n.published_date ?? undefined} className="block text-[10px] font-black tabular-nums text-[#817981]">
                  {n.published_date ? fmtPublishedDate(n.published_date) : "DATE TBA"}
                </time>
                {n.category && <span className="mt-1 block text-[9px] font-black text-[#f43679]">{OFFICIAL_NEWS_CATEGORY_LABELS[n.category]}</span>}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-black leading-[1.45] tracking-[-0.02em] text-[#1c171b] sm:text-[14px]">
                  {n.article_title}
                </p>
              </div>
              <ExternalLink size={14} className="shrink-0 text-gray-300" aria-hidden="true" />
            </InfoListRow>
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
