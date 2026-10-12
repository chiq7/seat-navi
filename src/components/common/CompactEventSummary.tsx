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
      className={`grid grid-cols-[auto_minmax(0,1fr)] rounded-[16px] border border-white/80 bg-white/72 px-3 shadow-sm backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-2 border-r border-[#eadfe4] py-2.5 pr-3 sm:pr-5">
        <CalendarDays size={15} className="shrink-0 text-[#ef4f87]" aria-hidden="true" />
        <p className="truncate text-[11px] font-black sm:text-[12px]">{formatEventDate(date)}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2 py-2.5 pl-3 sm:pl-5">
        <MapPin size={15} className="shrink-0 text-[#ef4f87]" aria-hidden="true" />
        <p className="truncate text-[11px] font-black sm:text-[12px]">{venue}</p>
      </div>
    </div>
  );
}
