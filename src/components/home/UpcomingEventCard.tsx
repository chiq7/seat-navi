import Link from "next/link";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

function fmtShortDate(d: string | null): string {
  if (!d) return "日程未定";
  const [, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(d).getDay()];
  return `${m}/${day}(${w})`;
}

export default function UpcomingEventCard({ event }: { event: CrawledEvent }) {
  const artistName = findArtistByKeyword(event.title)?.name ?? event.title;

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative shrink-0 w-[104px] bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform p-[10px] block no-underline"
    >
      <p className="text-[10px] font-bold text-gray-500 leading-none mt-[4px] mb-[4px]">{fmtShortDate(event.date)}</p>
      <p className="text-[15px] font-bold text-gray-900 truncate mb-[2px] mt-[4px]">{artistName}</p>
      <p className="text-[9px] text-gray-400 truncate mb-[2px]">{event.venue}</p>
    </Link>
  );
}
