"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { SpoilerToggle } from "@/components/spoiler-toggle";
import { DanketsuGauge } from "@/components/danketsu-gauge";
import { GateOverlay } from "@/components/gate-overlay";
import { MissingDataBanner } from "@/components/missing-data-banner";
import { ScreenshotWatermark } from "@/components/screenshot-watermark";
import { useDanketsu, useGate } from "@/hooks/use-danketsu";
import { useHighlightDot } from "@/hooks/use-highlight-dot";
import {
  SAMPLE_EVENTS,
  getSampleSections,
  getSampleReportsByEvent,
} from "@/lib/sample-data";
import { starRating, atsumariLabel, lotteryLabel } from "@/lib/utils";
import type { Event, Section, Report } from "@/lib/types";

const LOTTERY_FILTERS = [
  { key: "all", label: "すべて" },
  { key: "fc_first", label: "FC一次" },
  { key: "fc_second", label: "FC二次" },
  { key: "general", label: "一般" },
  { key: "upgrade", label: "アプグレ" },
  { key: "revival", label: "復活" },
  { key: "production", label: "制作開放" },
];

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [lotteryFilter, setLotteryFilter] = useState("all");
  const [upgradeOnly, setUpgradeOnly] = useState(false);
  const [showSpoilers, setShowSpoilers] = useState(false);

  // 団結Lv
  const danketsu = useDanketsu(eventId);

  // 詳細解放ゲート
  const gate = useGate(eventId);

  // 報告後ハイライト
  const { highlightBlock, showHighlight } = useHighlightDot();

  useEffect(() => {
    const found = SAMPLE_EVENTS.find((e) => e.id === eventId);
    setEvent(found ?? null);
    setSections(getSampleSections(eventId));
    setReports(getSampleReportsByEvent(eventId));
    setLoading(false);
  }, [eventId]);

  // 団結push + gate unlock
  const handleDanketsuAndGate = useCallback(() => {
    const success = danketsu.pushDanketsu();
    if (success) {
      gate.unlock("danketsu");
    }
    return success;
  }, [danketsu, gate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-4xl">🎤</div>
        <div className="text-lg font-bold text-gray-900">公演が見つかりません</div>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white"
        >
          トップに戻る
        </button>
      </div>
    );
  }

  // Prediction summary
  const generateSummary = (): string => {
    if (sections.length === 0) return "まだ報告が少ないので、傾向が見えてくるのはもう少し先かも";

    const fcHeavy = sections.filter((s) => s.fc_rate >= 0.5).map((s) => s.name);
    const generalHeavy = sections.filter((s) => s.general_rate >= 0.35).map((s) => s.name);
    const upgradeSpots = sections.filter((s) => s.upgrade_rate >= 0.1).map((s) => s.name);

    const parts: string[] = [];
    if (fcHeavy.length > 0) parts.push(`FC一次は${fcHeavy.slice(0, 3).join("・")}寄りっぽい`);
    if (generalHeavy.length > 0) parts.push(`一般は${generalHeavy.slice(0, 2).join("・")}に多め`);
    if (upgradeSpots.length > 0) parts.push(`アプグレは${upgradeSpots.slice(0, 2).join("・")}で報告あり`);

    const confidenceNote = event.atsumari_score < 3 ? "（まだ報告少なめなので参考程度に）" : "";
    return parts.length > 0
      ? parts.join("。") + confidenceNote
      : "データ収集中...もう少し報告が集まると傾向が見えてくるよ";
  };

  // Filtered sections
  const filteredSections = upgradeOnly
    ? sections.filter((s) => s.upgrade_rate >= 0.1)
    : sections;

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (!showSpoilers && r.has_spoiler) return false;
    if (lotteryFilter !== "all" && r.lottery_type !== lotteryFilter) return false;
    if (upgradeOnly && r.lottery_type !== "upgrade") return false;
    return true;
  });

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
              {event.event_name}
            </div>
            <div className="text-[10px] text-gray-500">
              {event.venue_name} · {event.event_date}
            </div>
          </div>
          {/* Header compact danketsu */}
          <DanketsuGauge
            gauge={danketsu.gauge}
            displayLv={danketsu.displayLv}
            message={danketsu.danketsuMessage}
            pushedToday={danketsu.pushedToday}
            pushAnimation={danketsu.pushAnimation}
            onPush={() => handleDanketsuAndGate()}
            compact
          />
        </div>
      </header>

      {/* Event Hero */}
      <section className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-5">
          <div className="text-center">
            <div className="text-3xl">🎤</div>
            <h1 className="mt-2 text-lg font-bold text-gray-900">
              {event.artist_name}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              {event.venue_name} · {event.event_date}
            </p>
            {/* 集まり度 */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs text-gray-500">集まり度</span>
              <span className="text-base font-bold text-amber-500">
                {starRating(event.atsumari_score)}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {atsumariLabel(event.atsumari_score)}
            </p>
          </div>
        </div>
      </section>

      {/* 🔥 団結Lv (フル表示) */}
      <section className="px-4 mt-4">
        <DanketsuGauge
          gauge={danketsu.gauge}
          displayLv={danketsu.displayLv}
          message={danketsu.danketsuMessage}
          pushedToday={danketsu.pushedToday}
          pushAnimation={danketsu.pushAnimation}
          onPush={() => handleDanketsuAndGate()}
        />
      </section>

      {/* 📢 不足データバナー */}
      <section className="px-4 mt-4">
        <MissingDataBanner sections={sections} eventId={eventId} />
      </section>

      {/* Prediction Summary */}
      <section className="px-4 mt-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔮</span>
            <span className="text-xs font-bold text-blue-900">今の予想サマリー</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-blue-800">
            {generateSummary()}
          </p>
        </div>
      </section>

      {/* === ゲート判定: 解放済み → フィルタ+詳細 / 未解放 → ゲートUI === */}
      {gate.unlocked ? (
        <>
          {/* Filters (解放後のみ) */}
          <section className="px-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">予想マップ</h2>
              <SpoilerToggle enabled={showSpoilers} onToggle={setShowSpoilers} />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {LOTTERY_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setLotteryFilter(f.key);
                    if (f.key === "upgrade") setUpgradeOnly(true);
                    else setUpgradeOnly(false);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    lotteryFilter === f.key
                      ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-dark)]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setUpgradeOnly(!upgradeOnly)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  upgradeOnly
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                <span>⚡</span>
                <span>アプグレだけ表示</span>
              </button>
            </div>
          </section>

          {/* Section Grid (詳細) */}
          <section className="mt-4 px-4">
            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
                <div className="text-3xl">📋</div>
                <div className="mt-2 text-sm font-medium text-gray-900">該当するエリア情報がありません</div>
                <div className="mt-1 text-xs text-gray-500">報告が集まると表示されます</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredSections.map((section) => {
                  const isHighlighted = showHighlight && highlightBlock != null &&
                    (section.name.includes(highlightBlock) || highlightBlock.includes(section.name.replace("ブロック", "")));
                  return (
                    <SectionCard
                      key={section.id}
                      section={section}
                      eventId={eventId}
                      highlight={isHighlighted}
                    />
                  );
                })}
              </div>
            )}

            {/* スクショ透かし */}
            <ScreenshotWatermark
              eventName={event.event_name}
              atsumariScore={event.atsumari_score}
              danketsuGauge={danketsu.gauge}
              danketsuLv={danketsu.displayLv}
            />
          </section>

          {/* Reports */}
          {filteredReports.length > 0 && (
            <section className="mt-6 px-4">
              <h2 className="mb-3 text-sm font-bold text-gray-900">当選報告</h2>
              <div className="space-y-2.5">
                {filteredReports.filter((r) => r.comment).map((report) => (
                  <div key={report.id} className="fade-in-up rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                        {lotteryLabel(report.lottery_type)}
                      </span>
                      <span>{report.block_name}{report.row_number ? ` ${report.row_number}列` : ""}</span>
                      <span>·</span>
                      <span>{report.applied_count}枚申込</span>
                    </div>
                    {report.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-800">{report.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {/* 未解放: 薄い要約だけ見せる + ゲート */}
          <section className="px-4 mt-4">
            <h2 className="mb-2 text-sm font-bold text-gray-900">予想マップ</h2>
            {/* 薄いプレビュー（セクション名だけ見せる） */}
            <div className="grid grid-cols-2 gap-2 opacity-60">
              {sections.slice(0, 4).map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <div className="text-sm font-bold text-gray-700">{s.name}</div>
                  <div className="mt-1 text-[10px] text-gray-400">FC {Math.round(s.fc_rate * 100)}%</div>
                </div>
              ))}
            </div>
            {sections.length > 4 && (
              <div className="mt-2 text-center text-[10px] text-gray-400">
                +{sections.length - 4}エリア
              </div>
            )}

            {/* ScreenshotWatermark on preview too */}
            <ScreenshotWatermark
              eventName={event.event_name}
              atsumariScore={event.atsumari_score}
              danketsuGauge={danketsu.gauge}
              danketsuLv={danketsu.displayLv}
            />
          </section>

          {/* ゲートUI */}
          <section className="px-4 mt-4">
            <GateOverlay
              eventId={eventId}
              onUnlock={gate.unlock}
              danketsuPushedToday={danketsu.pushedToday}
              onPushDanketsu={() => {
                const success = danketsu.pushDanketsu();
                return success;
              }}
            />
          </section>
        </>
      )}

      {/* Floating CTA */}
      <div className="fixed bottom-16 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
        <Link
          href={`/venue/${eventId}/section/${sections[0]?.id ?? "new"}/post`}
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
