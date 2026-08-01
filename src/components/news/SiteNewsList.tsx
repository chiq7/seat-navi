import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatSiteNewsDate, type SiteNewsPost } from "@/lib/siteNews";

type SiteNewsListProps = {
  posts: readonly SiteNewsPost[];
  compact?: boolean;
};

export default function SiteNewsList({ posts, compact = false }: SiteNewsListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-pink-100 bg-white shadow-sm">
      {posts.map((post, index) => (
        <Link
          key={post.slug}
          href={`/news/${post.slug}`}
          className={`flex min-h-11 items-center gap-2.5 px-3 py-3 no-underline transition-colors active:bg-[#FFF8FB] ${
            index > 0 ? "border-t border-pink-50" : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-full bg-[#FFF0F6] px-2 py-0.5 text-[10px] font-bold text-[#D94878]">
                {post.category}
              </span>
              <time className="text-[11px] tabular-nums text-gray-400" dateTime={post.publishedAt}>
                {formatSiteNewsDate(post.publishedAt)}
              </time>
            </div>
            <p className={`mt-1 font-bold leading-5 text-gray-900 ${compact ? "truncate text-[13px]" : "text-[14px]"}`}>
              {post.title}
            </p>
            {!compact && <p className="mt-1 text-[12px] leading-5 text-gray-500">{post.summary}</p>}
          </div>
          <ChevronRight size={17} className="shrink-0 text-gray-300" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
