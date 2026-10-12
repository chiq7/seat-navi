"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { SeatReport } from "@/lib/types";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";
import { SeatMapColorTabs } from "@/components/arena-map/SeatMapColorTabs";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
import { discoveryDateLabel } from "@/lib/seatDiscovery";
import { isInteractiveSeatMapPilot } from "@/lib/arena-map/seatMapNavigation";
import { predictionDetailHref, type PredictionView } from "@/lib/arena-map/predictionNavigation";

export type MapEvent = {
  id: string;
  reports: SeatReport[];
  dates?: string[];
  date?: string | null;
  externalObservations?: ExternalSeatObservation[];
  status?: "loading" | "ready" | "unavailable";
  events?: { id: string; date: string }[];
  limited?: boolean;
};

type Props = {
  mapEvent: MapEvent | null;
};

export default function MapPreviewSection({ mapEvent }: Props) {
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");
  const [view, setView] = useState<(PredictionView & { eventId: string }) | undefined>();
  const [attendance, setAttendance] = useState<{ mapId: string; eventId: string }>();
  const targetId = mapEvent?.id;
  const onPredictionViewChange = useCallback((next: PredictionView) => {
    if (targetId) setView({ ...next, eventId: targetId });
  }, [targetId]);

  if (!mapEvent) return null;
  const neutral = isInteractiveSeatMapPilot(mapEvent.id);
  const currentView = view?.eventId === mapEvent.id ? view : undefined;
  const eventChoices = mapEvent.events?.length ? mapEvent.events : mapEvent.date ? [{ id: mapEvent.id, date: mapEvent.date }] : [];
  // Default to the displayed prediction day, but never override an explicit attendance choice.
  const chosenAttendance = attendance?.mapId === mapEvent.id ? eventChoices.find(event => event.id === attendance.eventId) : undefined;
  const reportEvent = chosenAttendance
    ?? (currentView?.prediction ? eventChoices.find(event => event.date === currentView.date) : undefined)
    ?? eventChoices.find(event => event.id === mapEvent.id) ?? eventChoices[0];
  const detailEventId = (currentView?.prediction ? eventChoices.find(event => event.date === currentView.date)?.id : undefined) ?? mapEvent.id;

  return (
    <div className="border border-divider bg-white">
      <div className="flex items-end justify-between gap-3 border-b border-divider px-4 py-4 sm:px-6">
        <div>
          <p className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">LIVE SEAT MAP</p>
          <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#1c171b]">みんなの座席報告</h3>
        </div>
      </div>
      {mapEvent.dates?.length ? <p className="px-4 py-2 text-[12px] font-bold text-[#625a61]">{mapEvent.dates.map(discoveryDateLabel).join("・")}{mapEvent.dates.length > 1 ? " 合算" : ""}</p> : null}

      {!neutral && <SeatMapColorTabs value={colorMode} onChange={setColorMode} className="border-x-0 border-t-0 border-b-divider" />}

      <div className="overflow-hidden bg-[#fbf8fa] px-1 pb-3 pt-2 sm:px-4">
        {mapEvent.status === "loading" || mapEvent.status === "unavailable" ? <p role="status" className="p-4 text-center text-[13px]">{mapEvent.status === "loading" ? "座席情報を読み込み中…" : "座席情報を読み込めません。再読み込みしてください。"}</p> : <EventArenaMap
          key={mapEvent.id}
          eventId={mapEvent.id}
          reports={mapEvent.reports}
          externalObservations={mapEvent.externalObservations}
          unverifiedConditions={neutral}
          colorMode={colorMode}
          mapFullBleed
          showSaveButton
          detailEvents={mapEvent.events}
          interactive={neutral}
          predictionLimited={mapEvent.limited}
          onPredictionViewChange={onPredictionViewChange}
        />}
      </div>

      <div className="border-t border-divider px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {reportEvent && <label className="flex min-w-0 flex-1 items-center gap-1.5">
            <CalendarDays size={16} aria-hidden className="shrink-0 text-[#625a61]" /><span className="shrink-0 text-[12px] font-bold">参加日</span>
            <select aria-label="参加日" value={reportEvent.id} onChange={event => setAttendance({ mapId: mapEvent.id, eventId: event.target.value })}
              className="zr-focus min-h-11 min-w-0 flex-1 rounded-md border border-divider bg-white px-2 text-[14px] font-bold">
              {eventChoices.map(event => <option key={event.id} value={event.id}>{discoveryDateLabel(event.date)}</option>)}
            </select>
          </label>}
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-divider text-[12px] font-black">
        <Link href={predictionDetailHref(detailEventId, currentView)} className="zr-focus flex min-h-12 items-center justify-center gap-1 bg-[#f43679] text-white">座席表を見る<ArrowUpRight size={16} aria-hidden="true" /></Link>
        <Link href={`/report/ticket?event=${reportEvent?.id ?? mapEvent.id}`} className="zr-focus flex min-h-12 flex-col items-center justify-center text-[#d62a6b]">
          <span className="flex items-center gap-1"><MapPin size={16} aria-hidden />自分の席を報告</span>
          <span className="text-[10px] font-medium">図に自席が出る</span>
        </Link>
      </div>
      <Link
        href={`/events/${mapEvent.id}/fan-seat-prediction`}
        className="zr-focus group flex min-h-11 w-full items-center justify-between gap-3 border-t border-divider px-4 text-[12px] font-bold text-[#625a61]"
      >
        <span>この会場の予想図を投稿する</span>
        <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
