import { getEventDisplayVenueName } from "@/lib/publicVenueGuides";
import Link from "next/link";
import { CalendarDays, Camera, Eye, ListMusic, MapPin, TicketCheck } from "lucide-react";
import type { HomeFeedItem } from "@/lib/homeData";
import { fmtFeedDate } from "@/lib/homeData";
import { isXSeatPostUrl } from "@/lib/external-seats/xSeatPosts";
import { isPublishedFeedItem } from "@/lib/realtimeFeed";
import { formatPublicDataTime } from "@/lib/publicPageData";

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

export default function RealtimeFeedItem({ item, saved }: { item: HomeFeedItem; saved?: boolean }) {
  if (!isPublishedFeedItem(item)) return null;
  const Icon = feedIcons[item.type];
  const tag = tagStyles[item.type];
  const tagLabel = item.type;

  const cardClass = "group flex min-h-[76px] min-w-0 items-start gap-2.5 py-2.5 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d83d72]";
  const content = (
    <>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: tag.bg, color: tag.color }}
        aria-hidden="true"
      >
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-black leading-5 text-[#b72f5d]">{item.artistName}</span>
        <span className="mt-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="shrink-0 text-[10px] font-bold leading-4 text-[#574b52]">
            {tagLabel}
          </span>
          {Number.isFinite(Date.parse(item.createdAt)) && <time dateTime={item.createdAt} className="text-[10px] leading-4 text-[#6d6268]">{formatPublicDataTime(item.createdAt)}</time>}
        </span>
        <span className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-5 text-[#4e454b] group-hover:text-[#d83d72]">
          {item.detail}
        </span>
        <span className="mt-1 block truncate text-[10px] leading-4 text-[#6d6268]">
          {getEventDisplayVenueName(null, item.venue)}{item.venue && item.date ? " · " : ""}{fmtFeedDate(item.date)}
          {item.xHandle ? ` · @${item.xHandle}` : ""}
        </span>
      </span>
    </>
  );
  const card = saved && item.href.startsWith("/") && !item.href.startsWith("/events/") ? (
    <div className={cardClass}>{content}</div>
  ) : (
    <Link href={item.href} className={cardClass} aria-label={`${item.artistName} ${tagLabel}: ${item.detail}。${getEventDisplayVenueName(null, item.venue)} ${fmtFeedDate(item.date)}を開く`}>
      {content}
    </Link>
  );
  if (!item.sourceUrl) return card;

  return (
    <div>
      {card}
      <a className="zr-focus -mt-2 mb-1 inline-flex min-h-11 items-center pl-[42px] text-[11px] font-semibold underline"
        href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
        {isXSeatPostUrl(item.sourceUrl) ? "Xの元投稿を見る" : "出典の公式リセール情報"}
      </a>
    </div>
  );
}
