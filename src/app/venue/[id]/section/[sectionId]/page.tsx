"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SpoilerToggle } from "@/components/spoiler-toggle";
import {
  SAMPLE_EVENTS,
  getSampleSections,
  getSampleReports,
} from "@/lib/sample-data";
import { lotteryLabel } from "@/lib/utils";
import type { Event, Section, Report } from "@/lib/types";

function LotteryStatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-[60px] text-sm text-gray-700">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`progress-animated h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-bold text-gray-900">
        {percent}%
      </span>
    </div>
  );
}

export default function SectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const sectionId = params.sectionId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ev = SAMPLE_EVENTS.find((e) => e.id === eventId);
    setEvent(ev ?? null);
    const secs = getSampleSections(eventId);
    const sec = secs.find((s) => s.id === sectionId);
    setSection(sec ?? null);
    setReports(getSampleReports(sectionId));
    setLoading(false);
  }, [eventId, sectionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!section || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-4xl">📋</div>
        <div className="text-lg font-bold text-gray-900">
          セクションが見つかりません
        </div>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white"
        >
          トップに戻る
        </button>
      </div>
    );
  }

  // Summary generation
  const summaryParts: string[] = [];
  if (section.fc_rate >= 0.5) summaryParts.push("FC当選者が多い傾向");
  if (section.general_rate >= 0.3) summaryParts.push("一般からの配席も多め");
  if (section.upgrade_rate >= 0.1) summaryParts.push("アップグレードの報告あり");
  if (section.revival_rate >= 0.15) summaryParts.push("復活当選の割合が高め");
  const summary =
    summaryParts.length > 0
      ? `このブロックは${summaryParts.join("。")}。`
      : "このブロックのデータを集めています。";

  const filteredReports = showSpoilers
    ? reports
    : reports.filter((r) => !r.has_spoiler);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-gray-900">
              {section.name}
            </div>
            <div className="text-[10px] text-gray-500">
              {event.event_name} · {event.venue_name}
            </div>
          </div>
        </div>
      </header>

      {/* Section Hero + Summary */}
      <section className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-5">
          <div className="text-center">
            <div className="inline-block rounded-full bg-white/80 px-4 py-1 text-lg font-bold text-gray-900 shadow-sm">
              {section.name}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-700">
              {summary}
            </p>
          </div>
        </div>
      </section>

      {/* Lottery Distribution Stats */}
      <section className="mt-5 px-4">
        <h2 className="mb-2 text-sm font-bold text-gray-900">
          抽選種別ごとの配席割合
        </h2>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <LotteryStatRow label="FC" value={section.fc_rate} color="bg-gradient-to-r from-blue-300 to-blue-500" />
          <LotteryStatRow label="一般" value={section.general_rate} color="bg-gradient-to-r from-green-300 to-green-500" />
          <LotteryStatRow label="アプグレ" value={section.upgrade_rate} color="bg-gradient-to-r from-amber-300 to-amber-500" />
          <LotteryStatRow label="復活" value={section.revival_rate} color="bg-gradient-to-r from-purple-300 to-purple-500" />
          <LotteryStatRow label="制作開放" value={section.production_rate} color="bg-gradient-to-r from-gray-300 to-gray-400" />
        </div>
      </section>

      {/* Reports / Comments */}
      <section className="mt-5 px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">当選報告</h2>
          <SpoilerToggle enabled={showSpoilers} onToggle={setShowSpoilers} />
        </div>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
            <div className="text-2xl">💬</div>
            <div className="mt-2 text-sm text-gray-500">
              まだ報告がありません
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="fade-in-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                    {lotteryLabel(report.lottery_type)}
                  </span>
                  <span>{report.payment_method === "credit" ? "クレカ" : report.payment_method === "convenience" ? "コンビニ" : "その他"}</span>
                  <span>·</span>
                  <span>{report.applied_count}枚</span>
                  {report.row_number && (
                    <>
                      <span>·</span>
                      <span>{report.row_number}列</span>
                    </>
                  )}
                </div>
                {report.comment && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-800">
                    {report.comment}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.fc_years != null && (
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">
                      FC歴{report.fc_years}年
                    </span>
                  )}
                  {report.is_first_choice === true && (
                    <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] text-pink-600">
                      第一希望
                    </span>
                  )}
                  {report.has_companion === true && (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">
                      同行あり
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Post CTA - floating */}
      <div className="fixed bottom-16 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
        <Link
          href={`/venue/${eventId}/section/${sectionId}/post`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
        >
          <span>✍️</span>
          <span>当選席を報告する</span>
        </Link>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white/90 backdrop-blur-md">
        <Link href="/" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-gray-400">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-medium">ホーム</span>
        </Link>
        <Link href="/chat" className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-gray-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-medium">AIチャット</span>
        </Link>
      </nav>
    </div>
  );
}
