import Link from "next/link";
import type { HomeFeedItem } from "@/lib/homeData";
import { fmtFeedDate } from "@/lib/homeData";

const tagStyles: Record<HomeFeedItem["type"], { bg: string; color: string }> = {
  当落レポ: { bg: "#ffe7ef", color: "#d83e70" },
  公演情報: { bg: "#F3F4F6", color: "#6B7280" },
  座席報告: { bg: "#e9edff", color: "#536bd1" },
  座席予想: { bg: "#e9edff", color: "#536bd1" },
  現地レポ: { bg: "#fff0e9", color: "#cf7048" },
  セトリ: { bg: "#f1eaff", color: "#7655b2" },
};

export default function RealtimeFeedItem({ item }: { item: HomeFeedItem }) {
  const tag = tagStyles[item.type];
  return (
    <Link
      href={item.href}
      className="group flex min-h-[126px] min-w-0 flex-col gap-3 overflow-hidden rounded-[20px] bg-white px-4 py-4 no-underline shadow-[0_8px_20px_rgba(105,63,80,.05)] transition hover:-translate-y-0.5 md:px-5"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-bold"
          style={{ backgroundColor: tag.bg, color: tag.color }}
        >
          {item.type}
        </span>
        <p className="min-w-0 max-w-[38%] shrink truncate text-[14px] font-bold text-[#e84a80]">
          {item.artistName}
        </p>
        <span className="ml-auto min-w-0 flex-1 truncate text-right text-[10px] text-[#9a8a93]">
          {item.venue}・{fmtFeedDate(item.date)}
        </span>
      </div>
      <p className="line-clamp-2 text-[14px] font-medium leading-7 text-[#594d54]">
        {item.detail}
      </p>
    </Link>
  );
}
