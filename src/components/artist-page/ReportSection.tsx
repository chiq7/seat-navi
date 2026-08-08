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
import { PostAuthorLink } from "@/components/common/PostAuthorLink";
import type { PostAuthor } from "@/lib/postAuthors";

type Props = {
  reports: AfterReportCard[];
  eventMap: Map<string, CrawledEvent>;
  afterHref: string;
  reportHref: string;
  children?: ReactNode;
  authorMap?: Map<string, PostAuthor>;
};

type TimelineProps = {
  reports: AfterReportCard[];
  emptyText?: string;
  reportHref?: string;
  authorMap?: Map<string, PostAuthor>;
  actions?: (report: AfterReportCard) => ReactNode;
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
  authorMap,
  actions,
}: TimelineProps) {
  return (
    <div className="border-y border-[#ded8dc]">
      {reports.length > 0 ? (
        reports.map((report, index) => {
          const blockRow = blockRowText(report);
          const photoUrl = getReportPhotoUrl(report);
          const overallBadge = overallBadgeLabel(report);
          const structureBadges = structureBadgeLabels(report);
          const comment = report.memo?.trim() || null;
          const bgImage = overallBadgeBgImage(overallBadge);
          return (
            <div key={report.id} className="border-b border-[#ded8dc] last:border-b-0">
            <Link
              href={`/report/live/detail?reportId=${report.id}`}
              className="zr-focus flex min-h-[96px] items-stretch gap-3 bg-white px-4 py-2.5 no-underline transition-colors hover:bg-[#fff0f5]"
            >
              <div className="self-center">
                <ReportThumb index={index} photoUrl={photoUrl} />
              </div>
              <div
                className="flex min-w-0 flex-1 items-center self-stretch"
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
                        className="shrink-0 whitespace-nowrap bg-[#fff0f5] px-1.5 py-0.5 text-[10px] font-bold text-[#f43679]"
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
            {report.user_id && authorMap?.get(report.user_id) && (
              <div className="px-3 pb-2">
                <PostAuthorLink author={authorMap.get(report.user_id)} />
              </div>
            )}
            {actions && <div className="px-3 pb-2">{actions(report)}</div>}
            </div>
          );
        })
      ) : (
        <div className="community-soft-panel rounded-[20px] px-5 py-5 text-center sm:px-8 sm:py-6">
          <p className="text-[10px] font-black tracking-[0.2em] text-[#d64175]">NO REPORTS YET</p>
          <p className="mt-2 text-[16px] font-black tracking-[-0.03em]">{emptyText}</p>
          {reportHref && (
            <Link
              href={reportHref}
              className="zr-focus mt-4 inline-flex min-h-11 items-center border border-white/35 px-4 text-[11px] font-black text-white transition-colors hover:bg-white hover:text-[#1c171b]"
            >
              最初の現地レポを投稿する
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportSection({ reports, afterHref, reportHref, children, authorMap }: Props) {
  const displayReports = reports.slice(0, 4);

  return (
    <section className="artist-section" id="reports">
      <p className="artist-kicker">Live Reports</p>
      <h2 className="artist-heading">現地レポ</h2>
      <div className="mt-6 border border-[#282127] bg-[#fff8fa]">
        {children && <div className="p-4 sm:p-5">{children}</div>}
        <div className="flex items-end justify-between gap-4 border-t border-[#282127] bg-white px-5 py-3 sm:px-7">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-[#f43679]">RECENT VOICES</p>
            <h3 className="mt-1 text-[17px] font-black tracking-[-0.03em] text-[#1c171b]">現地レポタイムライン</h3>
          </div>
          <span className="mb-1 text-[9px] font-black tracking-[0.12em] text-[#817981]">{reports.length} REPORTS</span>
        </div>
        <ReportTimelineList reports={displayReports} reportHref={reportHref} authorMap={authorMap} />
        <div className="border-t border-[#282127] bg-white">
          <Link href={afterHref} className="zr-focus group flex min-h-13 items-center justify-between px-5 text-[12px] font-black text-[#1c171b] sm:px-7">
            すべての現地レポを見る
            <span className="text-[20px] leading-none text-[#f43679] transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
