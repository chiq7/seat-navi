"use client";

import { useState } from "react";
import Link from "next/link";

export type IndexEventRow = {
  id: string;
  date: string | null;
  venue: string;
  day: number;
  reportCount: number;
};

type Props = {
  /** 開催予定。日付昇順（近い順） */
  upcoming: IndexEventRow[];
  /** 過去の公演。日付降順（新しい順） */
  past: IndexEventRow[];
};

function fmtDateLabel(d: string | null): string {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}（${w}）`;
}

function yearOf(d: string | null): string {
  return d ? d.slice(0, 4) : "日程未定";
}

function ReportBadge({ count }: { count: number }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        count > 0 ? "bg-[#FFF1F6] text-[#FF6B9D]" : "bg-gray-100 text-gray-400"
      }`}
    >
      報告{count}件
    </span>
  );
}

function EventRow({ ev, highlight = false }: { ev: IndexEventRow; highlight?: boolean }) {
  return (
    <Link
      href={`/events/${ev.id}`}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 no-underline transition-colors ${
        highlight ? "bg-[#FFF1F6]" : "bg-white active:bg-gray-50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-gray-900">{fmtDateLabel(ev.date)}</span>
          <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
            Day{ev.day}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-gray-500">{ev.venue}</p>
      </div>
      <ReportBadge count={ev.reportCount} />
    </Link>
  );
}

const PAST_INITIAL_VISIBLE = 5;
const YEAR_JUMP_THRESHOLD = 30;

export default function EventIndexSection({ upcoming, past }: Props) {
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [pastVisibleCount, setPastVisibleCount] = useState(PAST_INITIAL_VISIBLE);

  const visibleUpcoming = upcomingExpanded ? upcoming : upcoming.slice(0, 3);
  const visiblePast = past.slice(0, pastVisibleCount);

  const yearJumpYears =
    past.length > YEAR_JUMP_THRESHOLD ? [...new Set(past.map((ev) => yearOf(ev.date)))] : [];

  function jumpToYear(year: string) {
    setPastVisibleCount(past.length);
    requestAnimationFrame(() => {
      document.getElementById(`event-index-year-${year}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 表示中の過去公演を年ごとにグルーピング（出現順を保持）
  const pastGroups: { year: string; rows: IndexEventRow[] }[] = [];
  for (const ev of visiblePast) {
    const y = yearOf(ev.date);
    const last = pastGroups[pastGroups.length - 1];
    if (last && last.year === y) {
      last.rows.push(ev);
    } else {
      pastGroups.push({ year: y, rows: [ev] });
    }
  }

  return (
    <section className="px-4 pt-4">
      {/* 開催予定 */}
      <div className="rounded-2xl border border-[#FF6B9D]/25 bg-[#FFF8FB] p-3 shadow-sm">
        <h2 className="mb-2 text-[15px] font-bold text-gray-900">開催予定の公演</h2>
        {upcoming.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-gray-400">現在、開催予定の公演はありません</p>
        ) : (
          <>
            <div className="space-y-1.5">
              {visibleUpcoming.map((ev, i) => (
                <EventRow key={ev.id} ev={ev} highlight={i === 0} />
              ))}
            </div>
            {!upcomingExpanded && upcoming.length > 3 && (
              <button
                type="button"
                onClick={() => setUpcomingExpanded(true)}
                className="mt-2 w-full rounded-lg py-2 text-center text-[12px] font-bold text-[#FF6B9D]"
              >
                もっと見る（他{upcoming.length - 3}件）
              </button>
            )}
          </>
        )}
      </div>

      {/* 過去の公演 */}
      {past.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-[15px] font-bold text-gray-900">過去の公演</h2>

          {yearJumpYears.length > 0 && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              {yearJumpYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => jumpToYear(y)}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold text-gray-600"
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {pastGroups.map((group, gi) => (
              <div key={group.year} id={`event-index-year-${group.year}`}>
                <p className="pb-1 pt-3 text-[11px] font-bold text-gray-400">{group.year}</p>
                <div className="space-y-1">
                  {group.rows.map((ev, i) => (
                    <EventRow
                      key={ev.id}
                      ev={ev}
                      highlight={upcoming.length === 0 && gi === 0 && i === 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {pastVisibleCount < past.length && (
            <button
              type="button"
              onClick={() => setPastVisibleCount(past.length)}
              className="mt-2 w-full rounded-lg py-2 text-center text-[12px] font-bold text-[#FF6B9D]"
            >
              もっと見る（他{past.length - pastVisibleCount}件）
            </button>
          )}
        </div>
      )}
    </section>
  );
}
