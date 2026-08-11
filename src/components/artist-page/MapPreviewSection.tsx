"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SeatReport } from "@/lib/types";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";
import { SeatMapColorTabs } from "@/components/arena-map/SeatMapColorTabs";

type MapEvent = {
  id: string;
  reports: SeatReport[];
};

type Props = {
  mapEvent: MapEvent | null;
};

export default function MapPreviewSection({ mapEvent }: Props) {
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");

  if (!mapEvent) return null;

  return (
    <div className="border border-[#282127] bg-white">
      <div className="flex items-end justify-between gap-3 border-b border-[#282127] px-4 py-4 sm:px-6">
        <div>
          <p className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">LIVE SEAT MAP</p>
          <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#1c171b]">みんなの座席報告</h3>
        </div>
        <span className="shrink-0 text-[10px] font-black text-[#817981]">{mapEvent.reports.length} REPORTS</span>
      </div>

      <SeatMapColorTabs value={colorMode} onChange={setColorMode} className="border-x-0 border-t-0 border-b-[#282127]" />

      <div className="overflow-hidden bg-[#fbf8fa] px-1 pb-3 pt-2 sm:px-4">
        <EventArenaMap
          eventId={mapEvent.id}
          reports={mapEvent.reports}
          colorMode={colorMode}
          mapFullBleed
          showSaveButton
        />
      </div>

      <Link
        href={`/events/${mapEvent.id}/fan-seat-prediction`}
        className="zr-focus group flex min-h-14 w-full items-center justify-between gap-3 border-t border-[#282127] bg-[#f43679] px-5 text-[13px] font-black text-white sm:px-6"
      >
        <span>この会場の予想図を投稿する</span>
        <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
