"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AllBlocksOverview } from "@/components/AllBlocksOverview";
import type { CrawledEvent, SeatReport, EventLayout, HistoricalPattern } from "@/lib/types";

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
    <div className="min-h-screen bg-gray-50 pb-10">
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

          {/* 参考予想図 */}
          {layout && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <span className="text-xs font-bold text-gray-700">参考予想図</span>
                <span className="ml-auto text-[10px] text-gray-400">ユーザー提供</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={layout.image_url} alt="座席予想図" className="w-full object-contain" style={{ maxHeight: "320px" }} />
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

      {/* 完了トースト */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-lg">
          {justAfterReported ? "答え合わせ投稿ありがとう！ 🎉" : "報告ありがとう！ 🎉"}
        </div>
      )}
    </div>
  );
}
