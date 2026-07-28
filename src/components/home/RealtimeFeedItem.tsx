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
      className="flex flex-col gap-2.5 px-3 py-3 no-underline active:bg-gray-50"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-bold"
          style={{ backgroundColor: tag.bg, color: tag.color }}
        >
          {item.type}
        </span>
        <p className="min-w-0 max-w-[30%] shrink truncate text-[14px] font-bold text-[#FF6B9D]">
          {item.artistName}
        </p>
        <span className="ml-auto min-w-0 flex-1 truncate text-right text-[11px] text-gray-500">
          {item.venue}・{fmtFeedDate(item.date)}
        </span>
      </div>
      <p className="line-clamp-2 text-[13px] font-normal leading-relaxed text-gray-700">
        {item.detail}
      </p>
    </Link>
  );
}
