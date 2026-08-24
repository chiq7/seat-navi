import Link from "next/link";
import { MoveRight } from "lucide-react";
import { parseEventTitle } from "@/lib/eventTitle";

type EventListItem = {
  id: string;
  title: string;
  date: string | null;
};

type EventListRowProps = {
  event: EventListItem;
  artistName?: string | null;
  secondary: string;
};

export function formatEventDate(date: string | null): string {
  if (!date) return "日程未定";
  const [year, month, day] = date.split("-").map(Number);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, day).getDay()];
  return `${String(year).slice(-2)}.${month}/${day}(${weekday})`;
}

/** 公演一覧で共通利用する、日付・公演名・補助情報のコンパクトな1行。 */
export function EventListRow({ event, artistName = null, secondary }: EventListRowProps) {
  const { tourName, isTestData } = parseEventTitle(event.title, artistName);

  return (
    <Link
      href={`/events/${event.id}`}
      aria-label={`${tourName}の公演・座席情報を見る`}
      className="zr-focus group grid min-h-[72px] min-w-0 grid-cols-[76px_minmax(0,1fr)_18px] items-center gap-3 border-b border-[#ded8dc] py-2.5 no-underline transition-colors hover:bg-[#fff8fa] sm:grid-cols-[102px_minmax(0,1fr)_20px] sm:px-3"
      data-event-list-row
    >
      <p className="text-[11px] font-black tabular-nums text-[#ef4f87] sm:text-[12px]">{formatEventDate(event.date)}</p>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-black tracking-[-0.025em] text-[#40383d]">{tourName}</p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-[10px] font-bold text-[#817981]">
          <span className="truncate">{secondary}</span>
          {isTestData && <span className="shrink-0 text-[8px] font-black text-[#a2939b]">TEST</span>}
        </p>
      </div>
      <MoveRight size={16} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}
