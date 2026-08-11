import { CalendarDays, MapPin } from "lucide-react";

type CompactEventSummaryProps = {
  date: string | null;
  venue: string;
  className?: string;
};

function formatEventDate(date: string | null): string {
  if (!date) return "日程未定";
  const [year, month, day] = date.split("-").map(Number);
  const week = ["日", "月", "火", "水", "木", "金", "土"][
    new Date(year, month - 1, day).getDay()
  ];
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}（${week}）`;
}

/** 報告・座席ページで共通利用する、スマホ向けのコンパクトな公演情報。 */
export function CompactEventSummary({
  date,
  venue,
  className,
}: CompactEventSummaryProps) {
  return (
    <div
      data-event-summary
      className={`grid rounded-[20px] border border-white/80 bg-white/72 px-4 shadow-sm backdrop-blur-sm sm:grid-cols-2 ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-3 py-3 sm:border-r sm:border-[#eadfe4] sm:pr-5">
        <CalendarDays size={17} className="shrink-0 text-[#ef4f87]" aria-hidden="true" />
        <p className="truncate text-[12px] font-black">{formatEventDate(date)}</p>
      </div>
      <div className="flex min-w-0 items-center gap-3 border-t border-[#eadfe4] py-3 sm:border-t-0 sm:pl-5">
        <MapPin size={17} className="shrink-0 text-[#ef4f87]" aria-hidden="true" />
        <p className="truncate text-[12px] font-black">{venue}</p>
      </div>
    </div>
  );
}
