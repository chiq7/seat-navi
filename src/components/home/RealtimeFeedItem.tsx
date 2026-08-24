import Link from "next/link";
import type { HomeFeedItem } from "@/lib/homeData";
import { fmtFeedDate } from "@/lib/homeData";

const tagStyles: Record<HomeFeedItem["type"], { bg: string; color: string }> = {
  当落レポ: { bg: "#fff0f5", color: "#d83e70" },
  公演情報: { bg: "#F3F4F6", color: "#6B7280" },
  座席報告: { bg: "#f2edff", color: "#7655b2" },
  座席予想: { bg: "#f2edff", color: "#7655b2" },
  現地レポ: { bg: "#fff0e9", color: "#cf7048" },
  セトリ: { bg: "#edf6ff", color: "#397fb8" },
};

export default function RealtimeFeedItem({ item }: { item: HomeFeedItem }) {
  const tag = tagStyles[item.type];
  const tagLabel = item.source === "sample" ? "投稿イメージ" : item.type;
  return (
    <Link
      href={item.href}
      className="group block min-h-[72px] min-w-0 overflow-hidden border-b border-[#eadfe4] bg-white px-3 py-3 no-underline transition-colors hover:bg-[#fff8fa] md:px-4"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: tag.bg, color: tag.color }}
        >
          {tagLabel}
        </span>
        <p className="min-w-0 max-w-[38%] shrink truncate text-[11px] font-black text-[#e84a80]">
          {item.artistName}
        </p>
        <span className="ml-auto min-w-0 flex-1 truncate text-right text-[10px] text-[#9a8a93]">
          {item.venue}・{fmtFeedDate(item.date)}
        </span>
      </div>
      <p className="mt-2 flex min-w-0 items-center gap-2 text-[12px] font-bold leading-5 text-[#594d54]">
        <span className="min-w-0 flex-1 truncate">{item.detail}</span>
        {item.xHandle && <span className="max-w-[32%] shrink-0 truncate text-[9px] text-[#817981]">@{item.xHandle}</span>}
      </p>
    </Link>
  );
}
