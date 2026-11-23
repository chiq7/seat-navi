"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { EventCarouselPicker } from "@/components/common/EventPicker";
import { getJstDateString } from "@/lib/artistPageData";
import { normalizeForSearch } from "@/lib/keywordMatch";
import { MISSING_PERFORMANCE_MESSAGE, requestedPerformanceId } from "@/lib/requestedPerformance";
import type { ReportOptions } from "@/lib/reportEventSelection";

const subscribeHydration = () => () => {};
const clientInteractive = () => true;
const serverInteractive = () => false;

const loadError = "読み込めませんでした。もう一度お試しください。";

export function useReportEventSelection(initial?: ReportOptions, initialLoadFailed = false) {
  const params = useSearchParams();
  const query = new URLSearchParams();
  const requested = requestedPerformanceId(params.getAll("event"));
  if (requested !== undefined) query.set("event", requested);
  for (const key of ["artist", "venue"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const key = query.toString();
  const [initialKey] = useState(key);
  const seeded = key === initialKey ? initial : undefined;
  const hasSeed = !!seeded;
  const [tries, setTries] = useState(0);
  const waitingForRetry = initialLoadFailed && key === initialKey && tries === 0;
  const [loaded, setLoaded] = useState<{key: string; attempt: number; options?: ReportOptions; error?: string} | null>(null);
  const [choice, setChoice] = useState<{ key: string; id: string } | null>(null);
  useEffect(() => {
    if (hasSeed || waitingForRetry) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setLoaded({ key, attempt: tries, error: loadError });
    }, 8000);
    async function load() {
      try {
        const res = await fetch("/api/public/report-events" + (key ? "?" + key : ""), { signal: controller.signal });
        if (!res.ok) throw new Error();
        const options: ReportOptions = await res.json();
        if (!controller.signal.aborted) setLoaded({ key, attempt: tries, options });
      } catch {
        if (!controller.signal.aborted) setLoaded({ key, attempt: tries, error: loadError });
      } finally {
        window.clearTimeout(timeout);
      }
    }
    void load();
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [key, hasSeed, tries, waitingForRetry]);
  const response = loaded?.key === key && loaded.attempt === tries ? loaded : null;
  const options = seeded ?? response?.options;
  const error = waitingForRetry ? loadError : response?.error;
  const events = options?.events ?? [];
  const selectedId = choice?.key === key ? choice.id : options?.unavailableEvent ? null : options?.selectedEventId;
  const selectedEventRow = events.find(e => e.id === selectedId) ?? null;
  return {
    events, selectedEventRow, selectedEvent: selectedEventRow?.id ?? "",
    setSelectedEvent: (id: string) => {
      setChoice({ key, id });
      if (!id || !options?.unavailableEvent) return;
      const url = new URL(window.location.href);
      url.searchParams.set("event", id);
      window.history.replaceState(window.history.state, "", url);
    },
    loading: !options && !error, error, retry: () => setTries(n => n + 1),
    venueName: options?.venueName, unavailableEvent: !!options?.unavailableEvent && !selectedEventRow
  };
}

export function ReportPerformancePicker({selection, onSelect}: {
  selection: ReturnType<typeof useReportEventSelection>; onSelect?: (id: string) => void;
}) {
  const [previousId, setPreviousId] = useState("");
  const [search, setSearch] = useState("");
  const interactive = useSyncExternalStore(subscribeHydration, clientInteractive, serverInteractive);
  const { selectedEventRow: selected, events } = selection;
  const filtered = useMemo(() => {
    const words = search.trim().split(/\s+/).filter(Boolean).map(normalizeForSearch);
    if (!words.length) return events;
    return events.filter(event => {
      const text = normalizeForSearch([event.title, event.venue, event.date].join(" "));
      return words.every(word => text.includes(word));
    });
  }, [events, search]);
  return <section className="zr-container py-3" aria-label="報告する公演">
    <fieldset disabled={!interactive} aria-busy={!interactive || selection.loading} className="m-0 min-w-0 rounded-xl border border-[#e6dce1] bg-white px-3 py-2.5">
      {selected ? <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[#70636a]">{selected.date?.replaceAll("-", "/") ?? "日程未確認"}　{selected.venue}</p>
          <p className="mt-1 break-words text-sm font-bold leading-snug">{selected.title}</p>
        </div>
        <button type="button" className="zr-focus min-h-11 shrink-0 px-2 text-sm font-bold text-[#a12b58]" onClick={() => {
          setPreviousId(selected.id);
          selection.setSelectedEvent("");
        }}>公演を変更</button>
      </div> : <>
        {selection.venueName && <p className="mb-1 text-sm font-bold">{selection.venueName}</p>}
        {selection.unavailableEvent && <p role="alert" className="mb-2 text-sm font-bold text-[#952c45]">{MISSING_PERFORMANCE_MESSAGE}</p>}
        {events.length > 12 && <input type="search" aria-label="公演を絞り込む" placeholder="公演名・会場名で絞り込み" value={search}
          onChange={event => setSearch(event.target.value)} className="zr-focus mb-2 min-h-11 w-full rounded-lg border border-[#ded4da] px-3 text-base" />}
        {!selection.error && !selection.loading && <QuickPicks events={search.trim() ? (filtered.length <= 8 ? filtered : []) : nearToday(events)}
          title={search.trim() ? "見つかった公演" : "最近・もうすぐの公演"} onPick={id => {
            selection.setSelectedEvent(id);
            if (id !== previousId) onSelect?.(id);
            setPreviousId("");
            setSearch("");
          }} />}
        {selection.error ? <p role="alert" className="text-sm">{selection.error}
          <button type="button" onClick={selection.retry} className="zr-focus ml-2 min-h-11 font-bold text-[#a12b58]">再読み込み</button>
        </p> : <EventCarouselPicker events={filtered} loading={selection.loading} selectedEventId={selection.selectedEvent}
          onSelect={id => {
            if (!id) return;
            selection.setSelectedEvent(id);
            if (id !== previousId) onSelect?.(id);
            setPreviousId("");
            setSearch("");
          }}
          today={getJstDateString()}
          includeTitle showVenueDay={false} inputId="report-performance" eyebrow="投稿する公演を選ぶ" />}
        {previousId && events.some(event => event.id === previousId) && <button type="button" className="zr-focus min-h-11 px-2 text-sm underline"
          onClick={() => { selection.setSelectedEvent(previousId); setPreviousId(""); setSearch(""); }}>公演の変更をやめる</button>}
      </>}
    </fieldset>
  </section>;
}

type PickEvent = { id: string; title: string; venue: string; date: string | null };

/** Shows from three days ago to three days ahead: the show a visitor most likely came to report. */
function nearToday<E extends PickEvent>(events: readonly E[]): E[] {
  const today = getJstDateString();
  const shift = (days: number) => new Date(Date.parse(today + "T00:00:00+09:00") + days * 86400000).toISOString().slice(0, 10);
  const from = shift(-3), to = shift(3);
  const distance = (date: string) => Math.abs(Date.parse(date) - Date.parse(today));
  // Today first, then the nearest days either side (yesterday's show before next week's).
  return events.filter(event => event.date && event.date >= from && event.date <= to)
    .sort((a, b) => distance(a.date!) - distance(b.date!) || (b.date! < a.date! ? -1 : 1)).slice(0, 6);
}

/** Tap targets for the likely shows, so nobody has to scroll a select of a thousand shows. */
function QuickPicks({ events, title, onPick }: { events: readonly PickEvent[]; title: string; onPick: (id: string) => void }) {
  if (!events.length) return null;
  return <div className="mb-2" data-report-quick-picks>
    <p className="mb-1 text-[11px] font-bold text-[#8a6f7d]">{title}</p>
    <ul className="grid gap-1.5">{events.map(event => <li key={event.id} className="min-w-0">
      <button type="button" onClick={() => onPick(event.id)} className="zr-focus flex min-h-12 w-full items-center gap-2 rounded-lg border border-[#e9cdd9] bg-[#fffafc] px-3 py-1.5 text-left">
        <span className="shrink-0 text-[12px] font-black text-[#a12b58]">{event.date ? event.date.slice(5).replace("-", "/") : "未定"}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold text-[#40383d]">{event.title}</span>
          <span className="block truncate text-[11px] text-[#706670]">{event.venue}</span></span>
      </button>
    </li>)}</ul>
  </div>;
}
