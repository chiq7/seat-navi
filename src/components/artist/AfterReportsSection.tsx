import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import { fmtDate, seatAreaLabel } from "@/lib/artistPageHelpers";

function photoUrl(path: string): string {
  return supabase.storage.from("after-report-photos").getPublicUrl(path).data.publicUrl;
}

type Props = {
  reports: AfterReportCard[];
  eventMap: Map<string, CrawledEvent>;
  afterHref: string;
};

export function AfterReportsSection({ reports, eventMap, afterHref }: Props) {
  return (
    <section className="mt-5">
      <div className="mb-3 flex items-end justify-between px-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          最新の現地レポ
        </h3>
        <Link
          href={afterHref}
          className="text-xs font-semibold"
          style={{ color: "#006876" }}
        >
          すべて見る
        </Link>
      </div>

      {reports.length > 0 ? (
        <div
          className="flex gap-3 overflow-x-auto pb-2 px-4"
          style={{ scrollbarWidth: "none" }}
        >
          {reports.map(report => {
            const ev = eventMap.get(report.event_id);
            const thumb = report.seat_view_photo_paths?.[0];
            const thumbUrl = thumb ? photoUrl(thumb) : null;

            return (
              <Link
                key={report.id}
                href={afterHref}
                className="min-w-[260px] snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="relative aspect-video bg-gray-100">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {ev?.date && (
                    <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                      {fmtDate(ev.date)} {ev.venue}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {report.torokko === "yes" && (
                      <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        トロッコ
                      </span>
                    )}
                    {report.kyakukudari === "yes" && (
                      <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        客降り
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold" style={{ color: "#006876" }}>
                    {seatAreaLabel(report.seat_area_type)}
                    {report.seat_block ? ` ${report.seat_block}` : ""}
                    {report.seat_row ? ` ${report.seat_row}列` : ""}
                  </p>
                  {report.memo && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">{report.memo}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {report.fansa === true && (
                      <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                        ファンサ
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mx-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400">現地レポートはまだありません</p>
          <Link
            href={afterHref}
            className="mt-3 inline-block rounded-xl px-5 py-2.5 text-xs font-bold text-white"
            style={{ background: "#006876" }}
          >
            最初のレポートを投稿する
          </Link>
        </div>
      )}
    </section>
  );
}
