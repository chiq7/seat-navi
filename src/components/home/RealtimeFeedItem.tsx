import Link from "next/link";
import { CalendarDays, Camera, Eye, ListMusic, MapPin, TicketCheck } from "lucide-react";
import type { HomeFeedItem } from "@/lib/homeData";
import { fmtFeedDate } from "@/lib/homeData";

const feedIcons: Record<HomeFeedItem["type"], typeof TicketCheck> = {
  当落レポ: TicketCheck,
  公演情報: CalendarDays,
  座席報告: MapPin,
  座席予想: Eye,
  現地レポ: Camera,
  セトリ: ListMusic,
};

const tagStyles: Record<HomeFeedItem["type"], { bg: string; color: string }> = {
  当落レポ: { bg: "#fff0f5", color: "#d83e70" },
  公演情報: { bg: "#f3f4f6", color: "#6b7280" },
  座席報告: { bg: "#f2edff", color: "#7655b2" },
  座席予想: { bg: "#f2edff", color: "#7655b2" },
  現地レポ: { bg: "#fff0e9", color: "#cf7048" },
  セトリ: { bg: "#edf6ff", color: "#397fb8" },
};

export default function RealtimeFeedItem({ item }: { item: HomeFeedItem }) {
  const Icon = feedIcons[item.type];
  const tag = tagStyles[item.type];
  const tagLabel = item.source === "sample" ? "投稿イメージ" : item.type;

  return (
    <Link
      href={item.href}
      aria-label={`${item.artistName} ${tagLabel}: ${item.detail}。${item.venue} ${fmtFeedDate(item.date)}を開く`}
      className="group flex min-h-[76px] min-w-0 items-start gap-2.5 py-2.5 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d83d72]"
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: tag.bg, color: tag.color }}
        aria-hidden="true"
      >
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start gap-1.5">
          <span className="shrink-0 text-[10px] font-bold leading-4 text-[#574b52]">
            {tagLabel}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-4 text-[#4e454b] group-hover:text-[#d83d72]">
          {item.detail}
        </span>
        <span className="mt-1 block truncate text-[10px] leading-4 text-[#6d6268]">
          {item.venue}{item.venue && item.date ? " · " : ""}{fmtFeedDate(item.date)}
          {item.xHandle ? ` · @${item.xHandle}` : ""}
        </span>
      </span>
    </Link>
  );
}
