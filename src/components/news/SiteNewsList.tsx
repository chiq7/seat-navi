import { CalendarDays, MoveRight } from "lucide-react";
import { formatSiteNewsDate, type SiteNewsPost } from "@/lib/siteNews";
import { InfoListRow } from "@/components/common/InfoListRow";

type SiteNewsListProps = {
  posts: readonly SiteNewsPost[];
  compact?: boolean;
};

export default function SiteNewsList({ posts, compact = false }: SiteNewsListProps) {
  return (
    <div className={compact ? "border-y border-[#eadfe4]" : "border-l border-t border-[#ded8dc] bg-white"}>
      {posts.map((post) => (
        <InfoListRow
          key={post.slug}
          href={`/news/${post.slug}`}
          className={compact ? "min-h-[76px]" : "min-h-[84px] border-r"}
        >
          <div>
            <time className="flex items-center gap-1 text-[10px] font-black tabular-nums text-[#817981]" dateTime={post.publishedAt}>
                <CalendarDays size={12} aria-hidden="true" />{formatSiteNewsDate(post.publishedAt)}
            </time>
            <span className="mt-1 block text-[9px] font-black text-[#f43679]">{post.category}</span>
          </div>
          <div className="min-w-0">
            <p className={`font-black leading-5 tracking-[-0.025em] text-[#1c171b] ${compact ? "truncate text-[13px]" : "line-clamp-2 text-[14px]"}`}>
              {post.title}
            </p>
            {!compact && <p className="mt-1 hidden truncate text-[11px] font-medium leading-5 text-[#817981] sm:block">{post.summary}</p>}
          </div>
          <MoveRight size={17} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </InfoListRow>
      ))}
    </div>
  );
}
