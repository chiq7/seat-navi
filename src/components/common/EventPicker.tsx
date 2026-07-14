"use client";

import { useMemo, useState } from "react";
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

const DAY_MS = 86400 * 1000;

/** 年をまたぐ公演が混在しても判別できるよう、短縮年を常に含める（例: 26.6/24（水）） */
function fmtChipDate(d: string | null): string {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  const yy = String(y).slice(-2);
  return `${yy}.${m}/${day}（${w}）`;
}

function NearTermChip<T extends PickerEvent>({
  event,
  isSelected,
  onSelect,
  dayLabel,
}: {
  event: T;
  isSelected: boolean;
  onSelect: (id: string) => void;
  dayLabel?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      className={`h-[64px] w-[96px] shrink-0 overflow-hidden rounded-xl px-2 py-1.5 text-left transition-colors ${
        isSelected ? "border-2 border-[#FF6B9D] bg-[#FFF1F6]" : "border border-gray-200 bg-white"
      }`}
    >
      <div className="whitespace-nowrap text-[12px] font-bold leading-tight text-gray-900">
        {fmtChipDate(event.date)}
      </div>
      <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-gray-800">
        {event.venue}
      </div>
      {dayLabel && (
        <span
          className={`mt-[1px] inline-block w-fit whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-bold leading-none ${
            isSelected ? "bg-[#FF6B9D] text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {dayLabel}
        </span>
      )}
    </button>
  );
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
};

/**
 * 直近公演（過去1か月〜今後）は横スライド、過去公演は「過去公演を見る」で開閉し年タブで絞り込む公演選択UI。
 * セトリページ専用。他ページの EventPicker（縦一覧＋過去は年グループ常時展開）とは別の見た目。
 */
export function EventCarouselPicker<T extends PickerEvent>({
  events,
  selectedEventId,
  onSelect,
  artistName = null,
  today,
  loading = false,
  className,
}: EventCarouselPickerProps<T>) {
  const todayStr = today ?? new Date().toISOString().split("T")[0];
  const monthAgoStr = new Date(new Date(todayStr).getTime() - 30 * DAY_MS)
    .toISOString()
    .split("T")[0];

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

  // 初期表示時点で選択中の公演がアーカイブ（30日より前）側なら、
  // 過去公演一覧を開いた状態・その年のタブを選択した状態で開始する。
  const selectedEvent = events.find((ev) => ev.id === selectedEventId);
  const selectedIsArchived = !!(selectedEvent?.date && selectedEvent.date < monthAgoStr);

  const [showPast, setShowPast] = useState(selectedIsArchived);
  const [selectedYear, setSelectedYear] = useState<string | null>(
    selectedIsArchived ? (selectedEvent!.date as string).slice(0, 4) : null,
  );

  const nearTerm = useMemo(
    () =>
      events
        .filter((ev) => ev.date && ev.date >= monthAgoStr)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [events, monthAgoStr],
  );

  // 選択中公演が30日より前の過去公演でnearTermに含まれない場合は、
  // 上部チップに単独追加し重複なく日付昇順で表示する。
  const displayedNearTerm = useMemo(() => {
    if (
      selectedEvent?.date &&
      selectedEvent.date < monthAgoStr &&
      !nearTerm.some((ev) => ev.id === selectedEvent.id)
    ) {
      return [...nearTerm, selectedEvent].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    }
    return nearTerm;
  }, [nearTerm, selectedEvent, monthAgoStr]);

  const archiveByYear = useMemo(() => {
    const archive = events
      .filter((ev) => ev.date && ev.date < monthAgoStr)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const map = new Map<string, T[]>();
    for (const ev of archive) {
      const year = (ev.date ?? "").slice(0, 4);
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(ev);
    }
    return map;
  }, [events, monthAgoStr]);

  const years = useMemo(
    () => [...archiveByYear.keys()].sort((a, b) => a.localeCompare(b)),
    [archiveByYear],
  );

  const activeYear =
    selectedYear && archiveByYear.has(selectedYear) ? selectedYear : (years[years.length - 1] ?? null);

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
      {/* 直近公演: 横スライド */}
      <div className="-mx-1 overflow-x-auto pb-1 hide-scrollbar">
        <div className="flex min-w-max gap-2 px-1">
          {displayedNearTerm.length > 0 ? (
            displayedNearTerm.map((ev) => (
              <NearTermChip
                key={ev.id}
                event={ev}
                isSelected={ev.id === selectedEventId}
                onSelect={onSelect}
                dayLabel={dayMap.has(ev.id) ? `Day${dayMap.get(ev.id)}` : null}
              />
            ))
          ) : (
            <p className="py-4 text-[12px] text-gray-400">直近の公演はありません</p>
          )}
        </div>
      </div>

      {/* 過去公演トグル */}
      {years.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowPast((s) => !s)}
            className="flex items-center gap-0.5 text-[11px] font-bold text-[#FF6B9D]"
          >
            {showPast ? "他の公演を閉じる" : "他の公演を見る"}
            <span
              className={`inline-block transition-transform duration-200 ${showPast ? "rotate-90" : ""}`}
            >
              ＞
            </span>
          </button>

          {showPast && (
            <div className="mt-2">
              {/* 年タブ */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                {years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setSelectedYear(year)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                      activeYear === year
                        ? "border-[#FF6B9D] bg-[#FF6B9D] text-white"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              {/* 選択中の年の公演一覧 */}
              {activeYear && (
                <div className="mt-2 space-y-1.5">
                  {archiveByYear.get(activeYear)!.map((ev) => (
                    <EventRow
                      key={ev.id}
                      event={ev}
                      artistName={artistName}
                      isSelected={ev.id === selectedEventId}
                      onSelect={(id) => {
                        setShowPast(false);
                        onSelect(id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
