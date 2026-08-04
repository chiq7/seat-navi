import Link from "next/link";
import type { HomeFeedItem } from "@/lib/homeData";
import { fmtFeedDate } from "@/lib/homeData";

const tagStyles: Record<HomeFeedItem["type"], { bg: string; color: string }> = {
  当落レポ: { bg: "#FEF3C7", color: "#92400E" },
  公演情報: { bg: "#F3F4F6", color: "#6B7280" },
  座席報告: { bg: "#DBEAFE", color: "#1D4ED8" },
  座席予想: { bg: "#DBEAFE", color: "#1D4ED8" },
  現地レポ: { bg: "#D1FAE5", color: "#047857" },
  セトリ: { bg: "#EDE9FE", color: "#6D28D9" },
};

export default function RealtimeFeedItem({ item }: { item: HomeFeedItem }) {
  const tag = tagStyles[item.type];
  return (
    <Link
      href={item.href}
      className="group flex min-h-[126px] min-w-0 flex-col gap-3 overflow-hidden border-b border-white/14 py-4 no-underline transition-colors hover:bg-white/[0.035] md:px-6 md:even:border-l"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-bold"
          style={{ backgroundColor: tag.bg, color: tag.color }}
        >
          {item.type}
        </span>
        <p className="min-w-0 max-w-[38%] shrink truncate text-[14px] font-bold text-[#ff5b96]">
          {item.artistName}
        </p>
        <span className="ml-auto min-w-0 flex-1 truncate text-right text-[10px] text-white/42">
          {item.venue}・{fmtFeedDate(item.date)}
        </span>
      </div>
      <p className="line-clamp-2 text-[14px] font-medium leading-7 text-white/74">
        {item.detail}
      </p>
    </Link>
  );
}
