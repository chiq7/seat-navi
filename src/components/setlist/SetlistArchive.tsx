"use client";

import { getEventDisplayVenueName } from "@/lib/publicVenueGuides";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type ArchiveEvent = {
  key: string;
  date: string;
  venue: string;
  title?: string;
  slot?: string;
  eventId?: string;
  venueHref?: string;
  songs?: string[];
  encoreAt?: number;
  sessionUnknown?: boolean;
};

export function SetlistArchive({ slug, count, initialEvents }: { slug: string; count: number; initialEvents: ArchiveEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(initialEvents.length === count ? "ready" : "idle");
  const [year, setYear] = useState(initialEvents[0]?.date.slice(0, 4) ?? "");
  const archive = useRef<HTMLDetailsElement>(null);

  const loadArchive = useCallback(async () => {
    if (status === "loading" || status === "ready") return;
    setStatus("loading");
    try {
      const response = await fetch(`/setlist-archive/${encodeURIComponent(slug)}.json`);
      if (!response.ok) throw new Error("Archive request failed");
      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || payload.length !== count) throw new Error("Archive count differs");
      const entries = payload as ArchiveEvent[];
      setEvents(entries);
      setYear(entries[0]?.date.slice(0, 4) ?? "");
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [count, slug, status]);

  useEffect(() => {
    // The browser can open the native details before React attaches its toggle handler.
    if (status === "idle" && archive.current?.open) void loadArchive();
  }, [loadArchive, status]);

  if (count === 0) return null;
  const years = [...new Set(events.map(event => event.date.slice(0, 4)))];
  const shown = events.filter(event => event.date.startsWith(year));
  return (
    <section className="zr-container pb-4" aria-labelledby="setlist-archive-heading">
      <h2 className="sr-only" id="setlist-archive-heading">過去公演の資料</h2>
      <details ref={archive} className="rounded-2xl border border-[#eadfe4] bg-white p-4"
        onToggle={event => { if (event.currentTarget.open && status === "idle") void loadArchive(); }}>
        <summary className="zr-focus min-h-11 cursor-pointer py-2 text-sm font-bold text-[#84234f]">
          過去公演を探す（{count}件）
        </summary>
        {status === "loading" && <p className="mt-3 text-sm" role="status">公演資料を読み込んでいます。</p>}
        {status === "error" && <button type="button" className="zr-focus mt-3 min-h-11 px-2 text-sm font-bold text-[#84234f]" onClick={() => void loadArchive()}>
          読み込めませんでした。再試行
        </button>}
        {events.length > 0 && <>
          {years.length > 1 && <label className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold">
            開催年
            <select className="zr-focus min-h-11 rounded-lg border border-[#eadfe4] bg-white px-3" value={year} onChange={event => setYear(event.target.value)}>
              {years.map(value => <option key={value} value={value}>{value}年</option>)}
            </select>
          </label>}
          <ul className="mt-4 divide-y divide-[#eadfe4]" data-setlist-archive={slug}>
            {shown.map(event => (
              <li key={event.key} className="py-3 text-sm" data-archive-event={event.key}>
                <p className="font-bold">
                  <time dateTime={event.date}>{event.date.replaceAll("-", "/")}</time>
                  {event.slot && <span className="ml-2">{event.slot}</span>}
                  <span className="ml-2">{getEventDisplayVenueName(undefined, event.venue)}</span>
                </p>
                {event.title && <p className="mt-1">{event.title}</p>}
                {event.sessionUnknown && <p className="mt-1 text-xs text-[#665861]">公演回は未確認</p>}
                <div className="flex flex-wrap gap-x-4">
                  {event.eventId && <Link className="zr-focus inline-flex min-h-11 items-center font-bold text-[#84234f]"
                    href={`/artists/${slug}/setlist?event=${event.eventId}`}>掲載済みのセトリ</Link>}
                  {event.venueHref && <Link className="zr-focus inline-flex min-h-11 items-center font-bold text-[#84234f]"
                    href={event.venueHref}>会場の座席表</Link>}
                </div>
                {!event.eventId && (event.songs?.length ? (
                  <details>
                    <summary className="zr-focus min-h-11 cursor-pointer py-3 font-bold text-[#84234f]">資料掲載のセトリ（曲順の照合前）</summary>
                    <ol className="list-decimal space-y-2 py-2 pl-6">
                      {event.songs.map((song, index) => <li key={index}>
                        {index === event.encoreAt && <p className="mb-1 text-xs font-bold text-[#665861]">アンコール</p>}
                        {song}
                      </li>)}
                    </ol>
                  </details>
                ) : <p className="mt-1 text-xs text-[#665861]">セトリ未確認</p>)}
              </li>
            ))}
          </ul>
        </>}
      </details>
    </section>
  );
}
