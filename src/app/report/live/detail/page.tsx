import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveReportDetailClient } from "./LiveReportDetailClient";
import { getCachedSeoReport, SITE_URL } from "@/lib/seoData";
import { buildSocialMetadata } from "@/lib/metadata";
import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import { canIndexLiveReport, liveReportTitle } from "@/lib/liveReportSeo";

type PageProps = { searchParams: Promise<{ reportId?: string | string[]; demo?: string | string[] }> };

/**
 * このページは元々 "use client" のため generateMetadata を持てない。
 * 表示ロジックは LiveReportDetailClient.tsx へそのまま移設し、ここはメタデータ専用のServer Component。
 * searchParams(reportId)を参照するため、このルートは動的レンダリングになる。
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const isAdDemo = params.demo === "ad";
  if (isAdDemo) {
    return {
      ...buildFileImageMetadata({
        path: "/report/live/detail?demo=ad",
        title: "現地レポの表示例｜ちけレポ",
        description: "座席からの見え方や会場の様子を伝える現地レポの表示例です。",
        robots: { index: false, follow: true },
      }),
      alternates: { canonical: null },
    };
  }
  const rawReportId = params.reportId;
  const reportId = typeof rawReportId === "string" ? rawReportId : null;
  if (!reportId) notFound();
  const info = await getCachedSeoReport(reportId);
  if (!info) notFound();

  const { event, artistName, isTestData, dateLabel, seatText } = info;
  const title = liveReportTitle(event, artistName, dateLabel);
  const seatPart = seatText ? `座席${seatText}からの見え方、` : "";
  const description = `${title.replace("｜ちけレポ", "")}。${seatPart}会場の様子を紹介します。`;
  const ogImagePath = `/api/og/report/${reportId}`;
  const canonical = `${SITE_URL}/report/live/detail?reportId=${encodeURIComponent(reportId)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: canIndexLiveReport(event, artistName, isTestData), follow: true },
    ...buildSocialMetadata({ title, description, url: canonical, ogType: "article", image: ogImagePath }),
  };
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  if (params.demo === "ad") return <LiveReportDetailClient />;
  const rawReportId = params.reportId;
  const reportId = typeof rawReportId === "string" ? rawReportId : null;
  if (!reportId || !(await getCachedSeoReport(reportId))) notFound();
  return <LiveReportDetailClient />;
}
