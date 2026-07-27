import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveReportDetailClient } from "./LiveReportDetailClient";
import { getCachedSeoReport, SITE_URL } from "@/lib/seoData";

type PageProps = { searchParams: Promise<{ reportId?: string | string[] }> };

/**
 * このページは元々 "use client" のため generateMetadata を持てない。
 * 表示ロジックは LiveReportDetailClient.tsx へそのまま移設し、ここはメタデータ専用のServer Component。
 * searchParams(reportId)を参照するため、このルートは動的レンダリングになる。
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const rawReportId = (await searchParams).reportId;
  const reportId = typeof rawReportId === "string" ? rawReportId : null;
  if (!reportId) notFound();
  const info = await getCachedSeoReport(reportId);
  if (!info) notFound();

  const { event, artistName, isTestData, dateLabel, seatText } = info;
  const name = artistName ?? "";

  const title = `${event.venue} ${dateLabel} の現地レポ｜${name}｜ちけレポ`;
  const seatPart = seatText ? `座席${seatText}からの見え方、` : "";
  const description = `${name} ${event.venue} ${dateLabel}の現地レポート。${seatPart}会場の様子。`;
  const ogImagePath = `/api/og/report/${reportId}`;
  const canonical = `${SITE_URL}/report/live/detail?reportId=${encodeURIComponent(reportId)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: !isTestData, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: [{ url: ogImagePath, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

export default async function Page({ searchParams }: PageProps) {
  const rawReportId = (await searchParams).reportId;
  const reportId = typeof rawReportId === "string" ? rawReportId : null;
  if (!reportId || !(await getCachedSeoReport(reportId))) notFound();
  return <LiveReportDetailClient />;
}
