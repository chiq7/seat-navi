import Link from "next/link";
import type { HomeFeedItem } from "@/lib/homeData";
import { fmtFeedDate } from "@/lib/homeData";

const tagStyles: Record<HomeFeedItem["type"], { bg: string; color: string }> = {
  当落レポ: { bg: "#FFF1F2", color: "#E11D48" },
  公演情報: { bg: "#FFF7ED", color: "#EA580C" },
  座席報告: { bg: "#EFF6FF", color: "#3B82F6" },
  座席予想: { bg: "#F5F3FF", color: "#7C3AED" },
  現地レポ: { bg: "#FDF0F4", color: "#FF6B9D" },
  セトリ: { bg: "#ECFDF5", color: "#059669" },
};

export default function RealtimeFeedItem({ item }: { item: HomeFeedItem }) {
  const tag = tagStyles[item.type];
  return (
    <Link
      href={item.href}
      className="flex flex-col gap-2 px-3 py-2.5 no-underline active:bg-gray-50"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-bold"
          style={{ backgroundColor: tag.bg, color: tag.color }}
        >
          {item.type}
        </span>
        <p className="min-w-0 max-w-[30%] shrink truncate text-[14px] font-bold text-gray-900">
          {item.artistName}
        </p>
        <span className="ml-auto min-w-0 flex-1 truncate text-right text-[11px] text-gray-500">
          {item.venue}
        </span>
        <span className="shrink-0 text-[11px] text-gray-500">{fmtFeedDate(item.date)}</span>
      </div>
      <p className="line-clamp-2 text-[13px] font-semibold leading-relaxed text-gray-800">
        {item.detail}
      </p>
    </Link>
  );
}
