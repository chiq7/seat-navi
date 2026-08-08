"use client";

import { useId, useMemo } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { parseEventTitle } from "@/lib/eventTitle";

/** ページごとに列が異なる公演行データを吸収するための最小限の形 */
export type PickerEvent = {
  id: string;
  title: string;
  venue: string;
  /** Day番号のグループ判定に使用。無い場合はvenue文字列にフォールバックする。 */
  venue_id?: string | null;
  date: string | null;
};

export type EventPickerProps<T extends PickerEvent = PickerEvent> = {
  /** アーティストの全公演（開催予定・過去とも未フィルタで渡す） */
  events: T[];
  selectedEventId: string | null;
  onSelect: (id: string) => void;
  artistName?: string | null;
  /** "YYYY-MM-DD" 形式。省略時は当日を使う */
  today?: string;
  loading?: boolean;
  className?: string;
};

function fmtDateShort(d: string | null): string {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}（${w}）`;
}

function EventRow({
  event,
  artistName,
  isSelected,
  onSelect,
}: {
  event: PickerEvent;
  artistName?: string | null;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const { tourName, isTestData } = parseEventTitle(event.title, artistName);
  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors active:scale-[0.99] ${
        isSelected ? "border-[#FF6B9D] bg-[#FFF1F6]" : "border-gray-200 bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[12px] font-bold ${isSelected ? "text-[#FF6B9D]" : "text-gray-900"}`}>
          {fmtDateShort(event.date)} {event.venue}
        </p>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="truncate text-[10px] text-gray-400">{tourName}</span>
          {isTestData && (
            <span className="shrink-0 rounded bg-gray-200 px-1 py-0.5 text-[8px] font-bold leading-none text-gray-500">
              テストデータ
            </span>
          )}
        </div>
      </div>
      {isSelected && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FF6B9D] text-[9px] text-white">
          ✓
        </span>
      )}
    </button>
  );
}

/**
 * 公演選択の共通UI。開催予定は近い順のフラットリスト、過去公演は年ごとにグループ化して表示する。
 * ツアー名ではグループ分けせず、parseEventTitle() の tourName は各行の補助表示にのみ使う。
 */
export function EventPicker<T extends PickerEvent>({
  events,
  selectedEventId,
  onSelect,
  artistName = null,
  today,
  loading = false,
  className,
}: EventPickerProps<T>) {
  if (loading) {
    return (
      <div className={`flex h-[74px] items-center justify-center ${className ?? ""}`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className={`py-4 text-center text-[12px] text-gray-400 ${className ?? ""}`}>
        公演が見つかりませんでした
      </p>
    );
  }

  const todayStr = today ?? new Date().toISOString().split("T")[0];

  const upcoming = events
    .filter((ev) => ev.date && ev.date >= todayStr)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const past = events
    .filter((ev) => !ev.date || ev.date < todayStr)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const pastByYear = new Map<string, T[]>();
  for (const ev of past) {
    const year = (ev.date ?? "").slice(0, 4) || "不明";
    if (!pastByYear.has(year)) pastByYear.set(year, []);
    pastByYear.get(year)!.push(ev);
  }
  const years = [...pastByYear.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className={className}>
      {upcoming.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-gray-400">開催予定</p>
          <div className="space-y-1.5">
            {upcoming.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                artistName={artistName}
                isSelected={ev.id === selectedEventId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
      {years.length > 0 && (
        <div className={upcoming.length > 0 ? "mt-3" : ""}>
          <p className="mb-1.5 text-[11px] font-semibold text-gray-400">過去公演</p>
          <div className="max-h-[280px] space-y-3 overflow-y-auto pr-0.5">
            {years.map((year) => (
              <div key={year}>
                <p className="mb-1 text-[10px] font-bold text-gray-400">{year}年</p>
                <div className="space-y-1.5">
                  {pastByYear.get(year)!.map((ev) => (
                    <EventRow
                      key={ev.id}
                      event={ev}
                      artistName={artistName}
                      isSelected={ev.id === selectedEventId}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 年をまたぐ公演が混在しても判別できるよう、短縮年を常に含める（例: 26.6/24（水）） */
function fmtChipDate(d: string | null): string {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  const yy = String(y).slice(-2);
  return `${yy}.${m}/${day}（${w}）`;
}

export type EventCarouselPickerProps<T extends PickerEvent = PickerEvent> = {
  events: T[];
  selectedEventId: string | null;
  onSelect: (id: string) => void;
  artistName?: string | null;
  /** "YYYY-MM-DD" 形式。省略時は当日を使う */
  today?: string;
  loading?: boolean;
  className?: string;
  eyebrow?: string;
  includeTitle?: boolean;
};

/** スマホではOS標準の選択シートが開く、1行型の公演切替UI。 */
export function EventCarouselPicker<T extends PickerEvent>({
  events,
  selectedEventId,
  onSelect,
  today,
  loading = false,
  className,
  eyebrow = "SELECT LIVE DATE",
  includeTitle = false,
}: EventCarouselPickerProps<T>) {
  const selectId = useId();
  const todayStr = today ?? new Date().toISOString().split("T")[0];

  // Day番号: 同一venue_id（無ければvenue文字列にフォールバック）内で日付昇順に採番する。
  // グループ内が1件のみ（1日限りの公演）の場合はDayを表示しない。
  const dayMap = useMemo(() => {
    const map = new Map<string, number>();
    const groups = new Map<string, T[]>();
    for (const ev of events) {
      const key = ev.venue_id ?? ev.venue ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ev);
    }
    for (const [, evs] of groups) {
      if (evs.length < 2) continue;
      const sorted = [...evs].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      sorted.forEach((ev, i) => map.set(ev.id, i + 1));
    }
    return map;
  }, [events]);

  const upcoming = useMemo(
    () =>
      events
        .filter((ev) => ev.date && ev.date >= todayStr)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [events, todayStr],
  );

  const past = useMemo(
    () =>
      events
        .filter((ev) => !ev.date || ev.date < todayStr)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [events, todayStr],
  );

  const optionLabel = (event: T) => {
    const day = dayMap.get(event.id);
    const base = `${fmtChipDate(event.date)}｜${event.venue}${day ? `｜Day${day}` : ""}`;
    return includeTitle ? `${base}｜${event.title}` : base;
  };

  if (loading) {
    return (
      <div className={`flex h-[64px] items-center justify-center ${className ?? ""}`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className={`py-4 text-center text-[12px] text-gray-400 ${className ?? ""}`}>
        公演が見つかりませんでした
      </p>
    );
  }

  return (
    <div className={className}>
      <label htmlFor={selectId} className="community-input block min-h-0 px-4 py-2.5 transition-colors">
        <span className="flex items-center gap-2 text-[9px] font-black tracking-[0.18em] text-[#f43679]">
          <CalendarDays size={14} strokeWidth={1.8} aria-hidden="true" />
          {eyebrow}
        </span>
        <span className="relative mt-1 block">
          <select
            id={selectId}
            value={selectedEventId ?? ""}
            onChange={(event) => onSelect(event.target.value)}
            className="zr-focus h-11 w-full appearance-none truncate border-0 bg-transparent pr-10 text-[13px] font-black tracking-[-0.02em] text-[#40383d] outline-none"
          >
            {!selectedEventId && <option value="">公演を選択してください</option>}
            {upcoming.length > 0 && (
              <optgroup label="開催予定">
                {upcoming.map((event) => <option key={event.id} value={event.id}>{optionLabel(event)}</option>)}
              </optgroup>
            )}
            {past.length > 0 && (
              <optgroup label="過去公演">
                {past.map((event) => <option key={event.id} value={event.id}>{optionLabel(event)}</option>)}
              </optgroup>
            )}
          </select>
          <ChevronDown size={20} strokeWidth={1.8} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#817981]" aria-hidden="true" />
        </span>
      </label>
    </div>
  );
}
