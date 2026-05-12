"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent, SeatReport, EventLayout, HistoricalPattern } from "@/lib/types";

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
// ブロック名パーサー
// ---------------------------------------------------------------------------

function parseBlock(name: string): { prefix: string; num: number } | null {
  const m = name.match(/^(.*?)(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], num: parseInt(m[2], 10) };
}

// ---------------------------------------------------------------------------
// 全体図（2D 会場マップ）
// ---------------------------------------------------------------------------

function AllBlocksOverview({
  blockMap,
  patterns,
}: {
  blockMap: Map<string, SeatReport[]>;
  patterns: HistoricalPattern[];
}) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showTip(e: React.MouseEvent | React.TouchEvent, text: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top - 6 });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTooltip(null), 1800);
  }
  function hideTip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTooltip(null);
  }

  // historical_patterns からブロックサイズ上限を収集
  const dimLookup = new Map<string, { maxRow: number; maxSeat: number }>();
  for (const p of patterns) {
    if (!p.max_row || !p.max_seat) continue;
    const ex = dimLookup.get(p.block);
    dimLookup.set(p.block, {
      maxRow:  Math.max(p.max_row,  ex?.maxRow  ?? 0),
      maxSeat: Math.max(p.max_seat, ex?.maxSeat ?? 0),
    });
  }

  // 報告済み + historical 既知ブロックの合算
  const reportedSet = new Set(
    [...blockMap.entries()].filter(([, r]) => r.length > 0).map(([k]) => k)
  );
  const allBlocks = new Set([...reportedSet, ...dimLookup.keys()]);
  if (allBlocks.size === 0) return null;

  // ブロック名 → 2D グリッド位置
  const positions = new Map<string, { prefix: string; num: number }>();
  for (const block of allBlocks) {
    const p = parseBlock(block);
    if (p) positions.set(block, p);
  }

  const prefixes = [...new Set([...positions.values()].map((p) => p.prefix))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const nums = [...new Set([...positions.values()].map((p) => p.num))]
    .sort((a, b) => a - b);

  const cellLookup = new Map<string, string>();
  for (const [block, { prefix, num }] of positions) {
    cellLookup.set(`${prefix}__${num}`, block);
  }

  function renderBlock(block: string) {
    const reports    = blockMap.get(block) ?? [];
    const hasReports = reports.length > 0;

    let maxRow: number;
    let maxSeat: number;
    if (!hasReports) {
      maxRow = 5; maxSeat = 8;
    } else if (reports.length <= 3) {
      maxRow  = Math.min(Math.max(...reports.map((r) => r.row_num))  + 2, 6);
      maxSeat = Math.min(Math.max(...reports.map((r) => r.seat_num)) + 3, 10);
    } else {
      maxRow  = Math.min(Math.max(...reports.map((r) => r.row_num))  + 2, 20);
      maxSeat = Math.min(Math.max(...reports.map((r) => r.seat_num)) + 3, 30);
    }

    const reportedMap = new Map<string, string>();
    for (const r of reports) reportedMap.set(`${r.row_num}-${r.seat_num}`, r.lottery_type);

    return (
      <div className="flex flex-col items-center gap-[2px]">
        <span className={`text-[7px] font-bold leading-none ${!hasReports ? "text-gray-400" : "text-gray-600"}`}>
          {block}
        </span>

        {!hasReports ? (
          /* 報告ゼロ: 斜線グレー */
          <div
            className="flex items-center justify-center rounded-sm"
            style={{
              width:  `${maxSeat * 5 + maxSeat - 1 + 2}px`,
              height: `${maxRow  * 5 + maxRow  - 1 + 2}px`,
              backgroundImage: "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 3px,#d1d5db 3px,#d1d5db 6px)",
            }}
          >
            <span className="text-center text-[5px] font-bold leading-tight text-gray-400/80">
              花道/<br />候補
            </span>
          </div>
        ) : (
          /* 通常: 全座席グリッド（white=未報告, 色=報告済み） */
          <div
            className="flex flex-col gap-[1px] rounded-sm bg-gray-300"
            style={{ padding: "1px" }}
          >
            {Array.from({ length: maxRow }, (_, i) => i + 1).map((row) => (
              <div key={row} className="flex gap-[1px]">
                {Array.from({ length: maxSeat }, (_, i) => i + 1).map((seat) => {
                  const lt  = reportedMap.get(`${row}-${seat}`);
                  const tip = lt
                    ? `[${block}] ${row}列 ${seat}番・${LOTTERY_LABEL[lt] ?? lt}`
                    : undefined;
                  return (
                    <div
                      key={seat}
                      className={`h-[5px] w-[5px] shrink-0 ${
                        lt ? (LOTTERY_COLOR[lt] ?? "bg-pink-400") : "bg-white"
                      } ${lt ? "cursor-pointer" : ""}`}
                      onMouseEnter={(e) => tip && showTip(e, tip)}
                      onMouseLeave={hideTip}
                      onTouchStart={(e) => {
                        if (tip) { e.preventDefault(); showTip(e, tip); }
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto pb-2">
        <div className="inline-block">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${nums.length}, auto)`,
              gap: "6px",
            }}
          >
            {prefixes.flatMap((prefix) =>
              nums.map((num) => {
                const block = cellLookup.get(`${prefix}__${num}`);
                return (
                  <div key={`${prefix}__${num}`}>
                    {block ? renderBlock(block) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2.5">
        {[
          { key: "fc1",        label: "FC1次",   cls: "bg-blue-500" },
          { key: "fc2",        label: "FC2次",   cls: "bg-cyan-400" },
          { key: "general",    label: "一般",     cls: "bg-emerald-500" },
          { key: "upgrade",    label: "アプグレ", cls: "bg-orange-400" },
          { key: "revival",    label: "復活",     cls: "bg-red-500" },
          { key: "production", label: "制作",     cls: "bg-purple-500" },
        ].map(({ key, label, cls }) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`h-2 w-2 shrink-0 rounded-sm ${cls}`} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundImage: "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 1px,#d1d5db 1px,#d1d5db 2px)" }}
          />
          <span className="text-[10px] text-gray-500">花道/候補</span>
        </div>
      </div>

      {/* 固定ツールチップ */}
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
// ページ
// ---------------------------------------------------------------------------

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const searchParams = useSearchParams();
  const justReported      = searchParams.get("reported")       === "1";
  const justAfterReported = searchParams.get("after_reported") === "1";

  const [event,     setEvent]     = useState<CrawledEvent | null>(null);
  const [reports,   setReports]   = useState<SeatReport[]>([]);
  const [layout,    setLayout]    = useState<EventLayout | null>(null);
  const [patterns,  setPatterns]  = useState<HistoricalPattern[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [analysis,  setAnalysis]  = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [showToast, setShowToast] = useState(justReported || justAfterReported);


  useEffect(() => {
    async function load() {
      const [evRes, repRes, layoutRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, venue, venue_id, date, genre, lottery_types")
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

      if (evRes.data?.venue) {
        const { data: patData } = await supabase
          .from("historical_patterns")
          .select("block, max_row, max_seat, event_name")
          .eq("venue", evRes.data.venue)
          .limit(50);
        if (patData) setPatterns(patData as HistoricalPattern[]);
      }

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
        body: JSON.stringify({ eventTitle: event.title, venue: event.venue, artist: event.title.split(" ")[0], reports }),
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

          {/* 報告数 */}
          <div>
            <span className="text-sm font-bold text-gray-900">
              報告数: <span className="text-[var(--accent)]">{reports.length}</span>件
            </span>
          </div>

          {/* 全体図 */}
          {blocks.length > 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold text-gray-700">全体図</p>
              <AllBlocksOverview blockMap={blockMap} patterns={patterns} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-14 text-center">
              <div className="text-4xl">🪑</div>
              <p className="mt-3 text-sm font-semibold text-gray-700">まだ報告がありません</p>
              <p className="mt-1 text-xs text-gray-400">最初の報告者になってね！</p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pt-8 text-center text-sm text-gray-500">公演が見つかりません</div>
      )}

      {/* FAB: 2ボタン縦並び */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center gap-2">
        <Link
          href={`/events/${eventId}/report`}
          className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[var(--accent-dark)] active:scale-95"
        >
          <span>✍️</span>
          <span>座席を報告する</span>
        </Link>
        <Link
          href={`/events/${eventId}/after-report`}
          className="flex items-center gap-2 rounded-full bg-rose-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-rose-600 active:scale-95"
        >
          <span>🎉</span>
          <span>答え合わせを投稿する</span>
        </Link>
      </div>

      {/* 完了トースト */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-lg">
          {justAfterReported ? "答え合わせ投稿ありがとう！ 🎉" : "報告ありがとう！ 🎉"}
        </div>
      )}
    </div>
  );
}
