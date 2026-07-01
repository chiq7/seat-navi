import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import type { CrawledEvent } from "@/lib/types";
import { fmtDate } from "@/lib/artistPageHelpers";

type Props = {
  reports: AfterReportCard[];
  eventMap: Map<string, CrawledEvent>;
  afterHref: string;
};

export default function ReportSection({ reports, eventMap, afterHref }: Props) {
  const displayReports = reports.slice(0, 4);

  return (
    <section className="mt-5 px-4" id="reports">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[22px] font-bold leading-none text-gray-900">現場レポ</h2>
        <Link href={afterHref} className="text-[14px] font-bold text-[#FF6B9D]">
          もっと見る
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {displayReports.length > 0 ? (
          displayReports.map((report, index) => {
            const ev = eventMap.get(report.event_id);
            const text =
              report.memo?.trim() ||
              (ev ? `${fmtDate(ev.date)} ${ev.venue}` : "現地レポ");
            return (
              <Link
                key={report.id}
                href={afterHref}
                className="grid min-h-11 grid-cols-[56px_1fr_18px] items-center gap-3 border-b border-gray-100 px-2.5 py-1.5 no-underline last:border-b-0"
              >
                <ReportThumb index={index} />
                <p className="truncate text-[14px] font-medium text-gray-900">{text}</p>
                <ChevronRight size={19} strokeWidth={2.2} className="text-gray-500" />
              </Link>
            );
          })
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-400">現地レポはまだありません</div>
        )}
      </div>
    </section>
  );
}

function ReportThumb({ index }: { index: number }) {
  const positions = ["30%", "45%", "70%", "52%"];
  return (
    <div className="h-[34px] w-14 overflow-hidden rounded-md bg-[#100716]">
      <div
        className="h-full w-full"
        style={{
          background:
            `radial-gradient(circle at ${positions[index % positions.length]} 22%, rgba(255,255,255,0.9) 0 3px, transparent 4px), ` +
            "linear-gradient(115deg, rgba(255,107,157,0.7), transparent 36%), " +
            "repeating-linear-gradient(90deg, rgba(255,107,157,0.95) 0 1px, transparent 1px 6px), " +
            "linear-gradient(180deg, #2b1230, #050306)",
        }}
      />
    </div>
  );
}
