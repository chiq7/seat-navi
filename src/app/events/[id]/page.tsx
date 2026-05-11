"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { SEAT_LOTTERY_OPTIONS } from "@/lib/types";
import type { CrawledEvent, SeatReport, EventLayout } from "@/lib/types";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const LOTTERY_COLOR: Record<string, string> = {
  fc1:        "bg-blue-500",
  fc2:        "bg-cyan-400",
  general:    "bg-emerald-500",
  upgrade:    "bg-orange-400",
  revival:    "bg-red-500",
  production: "bg-purple-500",
};

const LOTTERY_LABEL: Record<string, string> = {
  fc1:        "FC1次",
  fc2:        "FC2次",
  general:    "一般",
  upgrade:    "アプグレ",
  revival:    "復活当選",
  production: "制作開放",
};

// ---------------------------------------------------------------------------
// 予測ロジック
// ---------------------------------------------------------------------------

/** 同一行で隣り合う報告席の間に gap > 3 の空白があれば花道候補 */
function detectHanamichi(reports: SeatReport[]): boolean {
  const byRow = new Map<number, number[]>();
  for (const r of reports) {
    if (!byRow.has(r.row_num)) byRow.set(r.row_num, []);
    byRow.get(r.row_num)!.push(r.seat_num);
  }
  for (const seats of byRow.values()) {
    if (seats.length < 2) continue;
    const sorted = [...seats].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] > 3) return true;
    }
  }
  return false;
}

/** 列の広がりが少ない（≤3）のに席番号の広がりが大きい（≥15）→センステ候補 */
function detectCenterStage(reports: SeatReport[]): boolean {
  if (reports.length < 3) return false;
  const rows  = reports.map((r) => r.row_num);
  const seats = reports.map((r) => r.seat_num);
  return (
    Math.max(...rows)  - Math.min(...rows)  <= 3 &&
    Math.max(...seats) - Math.min(...seats) >= 15
  );
}

// ---------------------------------------------------------------------------
// SeatGrid
// ---------------------------------------------------------------------------

type TooltipState = { text: string; x: number; y: number } | null;

function SeatGrid({ reports }: { reports: SeatReport[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showTooltip(e: React.MouseEvent | React.TouchEvent, text: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top - 6 });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTooltip(null), 1800);
  }
  function hideTooltip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTooltip(null);
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center">
        <p className="text-xs text-gray-400">未報告</p>
      </div>
    );
  }

  const rows  = reports.map((r) => r.row_num);
  const seats = reports.map((r) => r.seat_num);
  const minRow  = Math.min(...rows),  maxRow  = Math.max(...rows);
  const minSeat = Math.min(...seats), maxSeat = Math.max(...seats);

  const reportedMap = new Map<string, string>();
  for (const r of reports) reportedMap.set(`${r.row_num}-${r.seat_num}`, r.lottery_type);

  const rowRange  = Array.from({ length: maxRow  - minRow  + 1 }, (_, i) => minRow  + i);
  const seatRange = Array.from({ length: maxSeat - minSeat + 1 }, (_, i) => minSeat + i);

  return (
    <>
      <div className="overflow-x-auto pb-0.5">
        <div className="inline-block">
          {/* 席番号ヘッダー */}
          <div className="flex">
            <div className="w-5 shrink-0" />
            {seatRange.map((s) => (
              <div key={s} className="w-2 shrink-0 text-center leading-none text-[7px] text-gray-400">
                {s % 5 === 0 ? s : ""}
              </div>
            ))}
          </div>

          {/* グリッド本体 */}
          {rowRange.map((row) => (
            <div key={row} className="flex items-center">
              {/* 列ラベル */}
              <div className="w-5 shrink-0 pr-0.5 text-right leading-none text-[7px] text-gray-400">
                {row % 5 === 0 ? row : ""}
              </div>
              {/* セル */}
              {seatRange.map((seat) => {
                const lt = reportedMap.get(`${row}-${seat}`);
                const tip = lt
                  ? `${row}列 ${seat}番・${LOTTERY_LABEL[lt] ?? lt}`
                  : undefined;
                return (
                  <div
                    key={seat}
                    className={`h-2 w-2 shrink-0 ${
                      lt ? (LOTTERY_COLOR[lt] ?? "bg-pink-400") : "bg-gray-100"
                    } ${lt ? "cursor-pointer" : ""}`}
                    onMouseEnter={(e) => tip && showTooltip(e, tip)}
                    onMouseLeave={hideTooltip}
                    onTouchStart={(e) => { if (tip) { e.preventDefault(); showTooltip(e, tip); } }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 固定ツールチップ（overflow-x-auto を突き抜ける） */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// BlockCard
// ---------------------------------------------------------------------------

function BlockCard({ block, reports }: { block: string; reports: SeatReport[] }) {
  const isHanamichi   = reports.length >= 2 && detectHanamichi(reports);
  const isCenterStage = detectCenterStage(reports);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900">{block}</span>
        {isHanamichi && (
          <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
            🌸 花道の可能性
          </span>
        )}
        {isCenterStage && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-600">
            ⭕ センテの可能性
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">報告 {reports.length}件</span>
      </div>
      <SeatGrid reports={reports} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 凡例
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {SEAT_LOTTERY_OPTIONS.map((opt) => (
        <div key={opt.value} className="flex items-center gap-1">
          <div className={`h-2.5 w-2.5 rounded-sm ${LOTTERY_COLOR[opt.value]}`} />
          <span className="text-[10px] text-gray-500">{opt.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <div className="h-2.5 w-2.5 rounded-sm bg-gray-100 border border-gray-200" />
        <span className="text-[10px] text-gray-500">未報告</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ページ
// ---------------------------------------------------------------------------

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const searchParams = useSearchParams();
  const justReported = searchParams.get("reported") === "1";

  const [event,     setEvent]     = useState<CrawledEvent | null>(null);
  const [reports,   setReports]   = useState<SeatReport[]>([]);
  const [layout,    setLayout]    = useState<EventLayout | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [analysis,  setAnalysis]  = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [showToast, setShowToast] = useState(justReported);

  useEffect(() => {
    async function load() {
      const [evRes, repRes, layoutRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, venue, venue_id, date, genre")
          .eq("id", eventId)
          .single(),
        supabase
          .from("seat_reports")
          .select("*")
          .eq("event_id", eventId)
          .order("block")
          .order("row_num")
          .order("seat_num"),
        supabase
          .from("event_layouts")
          .select("id, event_id, image_url, created_at")
          .eq("event_id", eventId)
          .limit(1)
          .maybeSingle(),
      ]);
      if (evRes.data)     setEvent(evRes.data as CrawledEvent);
      if (repRes.data)    setReports(repRes.data as SeatReport[]);
      if (layoutRes.data) setLayout(layoutRes.data as EventLayout);
      setLoading(false);
    }
    load();
  }, [eventId]);

  const runAnalysis = useCallback(async () => {
    if (!event || reports.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/events/${eventId}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTitle: event.title, venue: event.venue, reports }),
      });
      const data = await res.json();
      setAnalysis(data.analysis ?? "");
    } finally {
      setAnalyzing(false);
    }
  }, [event, reports, eventId]);

  useEffect(() => {
    if (!loading && reports.length > 0) runAnalysis();
  }, [loading, reports.length, runAnalysis]);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(t);
  }, [showToast]);

  const blockMap = new Map<string, SeatReport[]>();
  for (const r of reports) {
    if (!blockMap.has(r.block)) blockMap.set(r.block, []);
    blockMap.get(r.block)!.push(r);
  }
  const blocks = Array.from(blockMap.entries());

  function fmtDate(d: string | null) {
    if (!d) return "日程未定";
    const [y, m, day] = d.split("-").map(Number);
    const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
    return `${y}年${m}月${day}日(${w})`;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="flex-1 truncate text-sm font-bold text-gray-900">
            {loading ? "読み込み中..." : (event?.title ?? "公演詳細")}
          </h1>
        </div>
      </header>

      {loading ? (
        <div className="space-y-3 px-4 pt-5">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="mt-3 h-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : event ? (
        <div className="space-y-4 px-4 pt-4">
          {/* 公演情報 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{event.venue}</p>
            <p className="mt-1 text-base font-extrabold leading-snug text-gray-900">{event.title}</p>
            <p className="mt-1 text-sm text-gray-600">{fmtDate(event.date)}</p>
          </div>

          {/* AI分析カード */}
          {(analyzing || analysis) && (
            <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] p-4 text-white shadow-sm">
              <div className="mb-2 flex items-center gap-1.5">
                <span>🎀</span>
                <span className="text-xs font-bold">AI座席分析</span>
              </div>
              {analyzing ? (
                <div className="flex gap-1.5 py-1">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
                </div>
              ) : (
                <p className="text-xs leading-relaxed opacity-90">{analysis}</p>
              )}
            </div>
          )}

          {/* 参考予想図 */}
          {layout && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <svg className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 16l4.553 2.276A1 1 0 0021 24.382V8.618a1 1 0 00-.553-.894L15 5m0 2v14" />
                </svg>
                <span className="text-xs font-bold text-gray-700">参考予想図</span>
                <span className="ml-auto text-[10px] text-gray-400">ユーザー提供</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={layout.image_url}
                alt="座席予想図"
                className="w-full object-contain"
                style={{ maxHeight: "320px" }}
              />
            </div>
          )}

          {/* 報告数 + 凡例 */}
          <div>
            <span className="text-sm font-bold text-gray-900">
              報告数: <span className="text-[var(--accent)]">{reports.length}</span>件
            </span>
          </div>
          <Legend />

          {/* ブロックカード一覧 */}
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-14 text-center">
              <div className="text-4xl">🪑</div>
              <p className="mt-3 text-sm font-semibold text-gray-700">まだ報告がありません</p>
              <p className="mt-1 text-xs text-gray-400">最初の報告者になってね！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map(([b, reps]) => (
                <BlockCard key={b} block={b} reports={reps} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pt-8 text-center text-sm text-gray-500">公演が見つかりません</div>
      )}

      {/* 報告 FAB */}
      <Link
        href={`/events/${eventId}/report`}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[var(--accent-dark)] active:scale-95"
      >
        <span>✍️</span>
        <span>座席を報告する</span>
      </Link>

      {/* 報告完了トースト */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-lg">
          報告ありがとう！ 🎉
        </div>
      )}
    </div>
  );
}
