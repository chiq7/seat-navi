"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { parseEventTitle } from "@/lib/eventTitle";
import { EmptyState } from "@/components/common/EmptyState";

export type PastTourEvent = {
  id: string;
  date: string | null;
  venue: string;
  /** 生のevent.title。ツアー名の補助表示・テストデータ判定に使う */
  title: string;
};

export type PastTourGroup = {
  key: string;
  /** 年見出し（例: "2026年"） */
  title: string;
  /** 降順（新しい日付順） */
  events: PastTourEvent[];
};

type Props = {
  /** 新しい年が先頭に来る順で渡す */
  tours: PastTourGroup[];
  /** 公演行タップ時：ページ遷移せず現在の公演タブのマップをその公演に切り替える */
  onSelectEvent: (ev: PastTourEvent) => void;
  /** 年見出しタップ時：現在の公演タブの当選率をその年のデータに絞り込む */
  onSelectTour: (tour: PastTourGroup) => void;
  artistName?: string | null;
};

function fmtDateLabel(d: string | null): string {
  if (!d) return "日程未定";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${String(day).padStart(2, "0")}`;
}

export default function PastTourSection({ tours, onSelectEvent, onSelectTour, artistName = null }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 初期状態は最新年だけ開く
  useEffect(() => {
    if (tours.length > 0) {
      setExpanded((prev) => (prev.size === 0 ? new Set([tours[0].key]) : prev));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours.length > 0 ? tours[0].key : null]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (tours.length === 0) {
    return (
      <section className="border-b border-[#ded8dc] py-4">
        <EmptyState title="過去の公演はまだありません" />
      </section>
    );
  }

  return (
    <section className="artist-section" aria-labelledby="past-tour-title">
      <p className="artist-kicker">Live Archive</p>
      <h2 id="past-tour-title" className="whitespace-nowrap text-[clamp(20px,6vw,32px)] font-black tracking-[-0.04em] text-foreground">過去の公演を年から探す</h2>
      <p className="mt-2 text-[11px] font-medium text-[#817981]">年ごとに当落・座席を振り返れます。</p>

      <div className="mt-6 border-t border-divider">
        {tours.map((tour) => {
          const isOpen = expanded.has(tour.key);
          return (
            <div key={tour.key} className="border-b border-[#ded8dc]">
              <button
                type="button"
                onClick={() => {
                  toggle(tour.key);
                  onSelectTour(tour);
                }}
                className="zr-focus flex min-h-[76px] w-full items-center justify-between gap-4 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="min-w-0 flex-1 text-[24px] font-black tracking-[-0.04em] text-[#1c171b]">{tour.title}</span>
                <span className="text-[10px] font-black tracking-[0.12em] text-[#817981]">{tour.events.length} SHOWS</span>
                <ChevronDown
                  size={18}
                  strokeWidth={2.2}
                  className={`shrink-0 text-[#f43679] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-[#ded8dc] bg-[#fff8fa]">
                  {tour.events.map((ev) => {
                    const { tourName, isTestData } = parseEventTitle(ev.title, artistName);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className="zr-focus group grid min-h-[72px] w-full grid-cols-[48px_1fr_20px] items-center gap-3 border-b border-[#eadfe4] px-3 text-left transition-colors last:border-b-0 hover:bg-white sm:px-5"
                      >
                        <span className="font-black text-[#f43679]">{fmtDateLabel(ev.date)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-black text-[#1c171b]">{ev.venue}</span>
                          <span className="mt-0.5 flex items-center gap-1">
                            <span className="truncate text-[10px] font-bold text-[#817981]">{tourName}</span>
                            {isTestData && (
                              <span className="shrink-0 bg-[#e6e0e4] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#746c73]">
                                テストデータ
                              </span>
                            )}
                          </span>
                        </span>
                        <ArrowUpRight size={17} className="text-[#817981] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
