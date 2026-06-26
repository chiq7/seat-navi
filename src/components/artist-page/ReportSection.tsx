import { ChevronRight } from "lucide-react";

const reports = [
  "開演前から会場の熱気がすごかった！",
  "センステ近くで見やすかったです",
  "グッズ列は思ったよりスムーズでした",
  "音響も良くて最高の公演でした",
];

export default function ReportSection() {
  return (
    <section className="mt-5 px-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[22px] font-bold leading-none text-gray-900">現場レポ</h2>
        <a href="#" className="text-[14px] font-bold text-[#FF6B9D]">
          もっと見る
        </a>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {reports.map((report, index) => (
          <div key={report} className="grid min-h-11 grid-cols-[56px_1fr_18px] items-center gap-3 border-b border-gray-100 px-2.5 py-1.5 last:border-b-0">
            <ReportThumb index={index} />
            <p className="truncate text-[14px] font-medium text-gray-900">{report}</p>
            <ChevronRight size={19} strokeWidth={2.2} className="text-gray-500" />
          </div>
        ))}
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
            `radial-gradient(circle at ${positions[index]} 22%, rgba(255,255,255,0.9) 0 3px, transparent 4px), ` +
            "linear-gradient(115deg, rgba(255,107,157,0.7), transparent 36%), " +
            "repeating-linear-gradient(90deg, rgba(255,107,157,0.95) 0 1px, transparent 1px 6px), " +
            "linear-gradient(180deg, #2b1230, #050306)",
        }}
      />
    </div>
  );
}
