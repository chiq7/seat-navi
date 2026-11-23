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
  scopeLabel?: string;
  photoHref?: string;
};

type TimelineProps = {
  reports: AfterReportCard[];
  emptyText?: string;
  reportHref?: string;
  authorMap?: Map<string, PostAuthor>;
  actions?: (report: AfterReportCard) => ReactNode;
};

const EXAMPLE_REPORT: AfterReportCard = {
  id: "example", event_id: "example", user_id: null, seat_area_type: "arena", seat_description: null,
  seat_block: "A3", seat_row: "12", seat_number: null, seat_view_photo_paths: ["/images/after-reports/example-seat-view.webp"],
  main_stage: "5", center_stage: "4", fansa_rating: "4", torokko: "4", kyakukudari: "なし", silver_tape_rows: null, fansa: null,
  memo: "センステが目の前で、トロッコも横を通りました。", created_at: "2026-01-01T00:00:00Z",
};

/** One report row's content; shared by real rows (inside a link) and the example row shown when there are none. */
function ReportRowContent({ report, index }: { report: AfterReportCard; index: number }) {
  const blockRow = blockRowText(report);
  const photoUrl = getReportPhotoUrl(report);
  const overallBadge = overallBadgeLabel(report);
  const structureBadges = structureBadgeLabels(report);
  const comment = report.memo?.trim() || null;
  const bgImage = overallBadgeBgImage(overallBadge);
  return <>
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
                <div className="min-w-0 flex-1 px-1 py-1.5 sm:px-2">
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
                  <p className="mt-1 truncate text-[14px] font-bold text-[#4b4148]">
                    {blockRow ?? "座席情報なし"}
                  </p>
                  <p
                    className={`mt-1 line-clamp-2 min-h-[33px] text-[12px] leading-snug text-[#665a61] ${comment ? "" : "invisible"}`}
                  >
                    {comment || " "}
                  </p>
                </div>
              </div>
  </>;
}

/** Shows what a report looks like before the first one arrives (sample content, not a real post). */
export function ReportExample({ className = "" }: { className?: string }) {
  return <figure className={`m-0 border-b border-[#ded8dc] bg-[#fbf7f9] px-3 pb-3 pt-2 sm:px-4 ${className}`} data-report-example>
    <figcaption className="mb-1.5 text-[11px] font-bold text-[#8a6f7d]">現地レポの表示例（サンプル）</figcaption>
    <div className="pointer-events-none flex min-h-[88px] items-stretch gap-3 rounded-lg bg-white px-3 py-2.5 opacity-90" aria-hidden="true">
      <ReportRowContent report={EXAMPLE_REPORT} index={0} />
    </div>
  </figure>;
}

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
          return (
            <div key={report.id} className="border-b border-[#ded8dc] last:border-b-0">
            <Link
              href={`/report/live/detail?reportId=${report.id}`}
              className="zr-focus flex min-h-[88px] items-stretch gap-3 bg-white px-3 py-2.5 no-underline transition-colors hover:bg-[#fff0f5] sm:px-4"
              data-info-list-row="report"
            >
              <ReportRowContent report={report} index={index} />
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
        <div>
          <ReportExample />
        <div className="community-soft-panel rounded-[20px] px-5 py-5 text-center sm:px-8 sm:py-6">
          <p className="mt-2 text-[16px] font-black tracking-[-0.03em]">{emptyText}</p>
          {reportHref && (
            <Link
              href={reportHref}
              className="zr-focus mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#ad2157] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#8d1946]"
            >
              現地レポを投稿する
            </Link>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

export default function ReportSection({ reports, afterHref, reportHref, children, authorMap, scopeLabel, photoHref }: Props) {
  const displayReports = reports.slice(0, 4);

  return (
    <section className="artist-section" id="reports">
      <h2 className="artist-heading">参加者の現地レポ</h2>
      {scopeLabel && <p className="mt-2 text-[12px] font-bold text-[#625a61]">{scopeLabel}</p>}
      <div className="mt-6 border border-divider bg-[#fff8fa]">
        {children && <div className="p-4 sm:p-5">{children}</div>}
        <div className="flex items-end justify-between gap-4 border-t border-divider bg-white px-5 py-3 sm:px-7">
          <div>
            <h3 className="text-[17px] font-black tracking-[-0.03em] text-[#1c171b]">届いた現地レポ</h3>
          </div>
          <span className="mb-1 text-[12px] font-bold text-[#817981]">{reports.length}件</span>
        </div>
        <ReportTimelineList reports={displayReports} reportHref={reportHref} authorMap={authorMap} />
        {reports.length === 0 && photoHref && <Link href={photoHref} className="zr-focus flex min-h-12 items-center justify-center rounded-xl border border-[#e9cdd9] bg-white px-4 text-[13px] font-bold text-[#a41c53]">会場の座席写真を見る</Link>}
        <div className="border-t border-divider bg-white">
          <Link href={afterHref} className="zr-focus group flex min-h-13 items-center justify-between px-5 text-[12px] font-black text-[#1c171b] sm:px-7">
            すべての現地レポを見る
            <span className="text-[20px] leading-none text-[#f43679] transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
