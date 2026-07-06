"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type PastTourEvent = {
  id: string;
  date: string | null;
  venue: string;
};

export type PastTourGroup = {
  key: string;
  title: string;
  /** 昇順（日付順） */
  events: PastTourEvent[];
};

type Props = {
  /** 直近のツアーが先頭に来る順で渡す */
  tours: PastTourGroup[];
  /** 公演行タップ時：ページ遷移せず現在の公演タブのマップをその公演に切り替える */
  onSelectEvent: (ev: PastTourEvent) => void;
  /** ツアー名タップ時：現在の公演タブの当選率をそのツアーのデータに絞り込む */
  onSelectTour: (tour: PastTourGroup) => void;
};

function fmtDateLabel(d: string | null): string {
  if (!d) return "日程未定";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${String(day).padStart(2, "0")}`;
}

export default function PastTourSection({ tours, onSelectEvent, onSelectTour }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
      <section className="px-4 py-10 text-center">
        <p className="text-[12px] text-gray-400">過去の公演はまだありません</p>
      </section>
    );
  }

  return (
    <section className="px-4 pt-4">
      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {tours.map((tour) => {
          const isOpen = expanded.has(tour.key);
          return (
            <div key={tour.key}>
              <button
                type="button"
                onClick={() => {
                  toggle(tour.key);
                  onSelectTour(tour);
                }}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="min-w-0 truncate text-[14px] font-bold text-gray-900">{tour.title}</span>
                <ChevronDown
                  size={18}
                  strokeWidth={2.2}
                  className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="space-y-1 px-4 pb-3">
                  {tour.events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition-colors active:bg-gray-50"
                    >
                      <span className="w-10 shrink-0 font-bold text-gray-700">{fmtDateLabel(ev.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-gray-600">{ev.venue}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
