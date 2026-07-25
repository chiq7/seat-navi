import type { ReactNode } from "react";
import Link from "next/link";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import type { CrawledEvent } from "@/lib/types";
import {
  blockRowText,
  getReportPhotoUrl,
  overallBadgeLabel,
  structureBadgeLabels,
} from "@/lib/afterReportCard";
import { ReportThumb } from "@/components/artist-page/ReportThumb";

type Props = {
  reports: AfterReportCard[];
  eventMap: Map<string, CrawledEvent>;
  afterHref: string;
  reportHref: string;
  children?: ReactNode;
};

type TimelineProps = {
  reports: AfterReportCard[];
  emptyText?: string;
  reportHref?: string;
};

/** 神席/良席バッジは背景画像で表現する(after-reports一覧ページと同じ) */
function overallBadgeBgImage(label: string | null): string | null {
  if (label === "神席") return "/images/after-reports/kamiseki-bg1.png";
  if (label === "良席") return "/images/after-reports/ryoseki-bg1.png";
  return null;
}

export function ReportTimelineList({
  reports,
  emptyText = "現地レポはまだありません",
  reportHref,
}: TimelineProps) {
  return (
    <div className="overflow-hidden border border-gray-100">
      {reports.length > 0 ? (
        reports.map((report, index) => {
          const blockRow = blockRowText(report);
          const photoUrl = getReportPhotoUrl(report);
          const overallBadge = overallBadgeLabel(report);
          const structureBadges = structureBadgeLabels(report);
          const comment = report.memo?.trim() || null;
          const bgImage = overallBadgeBgImage(overallBadge);
          return (
            <Link
              key={report.id}
              href={`/report/live/detail?reportId=${report.id}`}
              className="flex min-h-[104px] items-stretch gap-2 overflow-hidden border-b border-gray-100 no-underline last:border-b-0"
            >
              <div className="self-center">
                <ReportThumb index={index} photoUrl={photoUrl} />
              </div>
              <div
                className="m-0.5 flex min-w-0 flex-1 items-center self-stretch rounded-lg"
                style={
                  bgImage
                    ? {
                        backgroundImage: `url('${bgImage}')`,
                        backgroundSize: "104%",
                        backgroundPosition: "center top",
                        height: "100%",
                      }
                    : undefined
                }
              >
                <div className="min-w-0 flex-1 px-2 py-1.5">
                  <div
                    className={`flex h-[20px] max-w-[70%] items-center justify-start gap-0.5 overflow-hidden ${structureBadges.length > 0 ? "" : "invisible"}`}
                  >
                    {(structureBadges.length > 0 ? structureBadges.slice(0, 2) : ["-"]).map((label) => (
                      <span
                        key={label}
                        className="shrink-0 whitespace-nowrap rounded-full bg-[#FFF1F6] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6B9D]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 truncate text-[14px] font-bold text-gray-900">
                    {blockRow ?? "座席情報なし"}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 min-h-[33px] text-[12px] leading-snug text-gray-700 ${comment ? "" : "invisible"}`}
                  >
                    {comment || " "}
                  </p>
                </div>
              </div>
            </Link>
          );
        })
      ) : (
        <div className="px-4 py-6 text-center text-sm text-gray-400">
          <p>{emptyText}</p>
          {reportHref && (
            <Link
              href={reportHref}
              className="mt-2 inline-flex rounded-full bg-[#FF6B9D] px-4 py-2 text-[12px] font-bold text-white"
            >
              最初の現地レポを投稿する
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportSection({ reports, afterHref, reportHref, children }: Props) {
  const displayReports = reports.slice(0, 4);

  return (
    <section className="mt-3 px-3" id="reports">
      <h2 className="mb-3 text-[18px] font-bold leading-none text-gray-900">現地レポ</h2>
      <div className="rounded-[24px] border border-pink-100 bg-white p-3 shadow-sm">
        {children && <div className="mb-3">{children}</div>}
        <h3 className="mb-1.5 text-center text-[12px] font-semibold text-gray-500">現地レポタイムライン</h3>
        <ReportTimelineList reports={displayReports} reportHref={reportHref} />
        <div className="mt-3 text-center">
          <Link href={afterHref} className="text-[14px] font-bold text-[#FF6B9D]">
            もっと見る
          </Link>
        </div>
      </div>
    </section>
  );
}
