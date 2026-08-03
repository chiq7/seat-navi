import Link from "next/link";
import { CalendarDays, MoveRight } from "lucide-react";
import { formatSiteNewsDate, type SiteNewsPost } from "@/lib/siteNews";

type SiteNewsListProps = {
  posts: readonly SiteNewsPost[];
  compact?: boolean;
};

export default function SiteNewsList({ posts, compact = false }: SiteNewsListProps) {
  return (
    <div className="border-l border-t border-[#ded8dc] bg-white">
      {posts.map((post) => (
        <Link
          key={post.slug}
          href={`/news/${post.slug}`}
          className="zr-focus group grid min-h-[112px] gap-3 border-b border-r border-[#ded8dc] px-4 py-4 no-underline transition-colors hover:bg-[#fff0f5] sm:grid-cols-[140px_1fr_28px] sm:items-center"
        >
          <div>
            <span className="inline-flex border border-[#efb6ca] px-2 py-1 text-[9px] font-black text-[#c91558]">
                {post.category}
            </span>
            <time className="mt-2 flex items-center gap-1.5 text-[10px] font-bold tabular-nums text-[#958d93]" dateTime={post.publishedAt}>
                <CalendarDays size={12} />
                {formatSiteNewsDate(post.publishedAt)}
            </time>
          </div>
          <div className="min-w-0">
            <p className={`font-black leading-6 tracking-[-0.025em] text-[#1c171b] ${compact ? "truncate text-[13px]" : "text-[15px]"}`}>
              {post.title}
            </p>
            {!compact && <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-5 text-[#817981]">{post.summary}</p>}
          </div>
          <MoveRight size={17} className="hidden shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
