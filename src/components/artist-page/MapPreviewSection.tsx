import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SeatReport } from "@/lib/types";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";

// /events/[id] の「みんなの座席報告マップ」と同一の色分けタブ
const COLOR_TABS: { value: ColorMode; label: string }[] = [
  { value: "lottery",   label: "🎫 抽選回" },
  { value: "fcHistory", label: "👑 FC歴" },
  { value: "payment",   label: "💳 支払い" },
  { value: "upgrade",   label: "⭐ アプグレ" },
];

type MapEvent = {
  id: string;
  reports: SeatReport[];
};

type VenueChip = {
  venue: string;
  eventId: string;
};

type Props = {
  venues: VenueChip[];
  activeVenue?: string | null;
  onSelectVenue?: (venue: string) => void;
  topPredictionImageUrl?: string | null;
  mapEvent: MapEvent | null;
  detailHref?: string | null;
};

export default function MapPreviewSection({
  venues,
  activeVenue = null,
  onSelectVenue,
  topPredictionImageUrl = null,
  mapEvent,
  detailHref = null,
}: Props) {
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");

  return (
    <section className="mt-4 px-4">
      <h2 className="mb-2 text-[22px] font-bold leading-none text-gray-900">マップ</h2>
      {mapEvent && venues.length > 0 && (
        <div className="mb-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <p className="mb-1.5 text-[11px] font-semibold text-gray-400">会場を選択</p>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {venues.map(({ venue }) => (
              <button
                key={venue}
                type="button"
                onClick={() => onSelectVenue?.(venue)}
                aria-pressed={venue === activeVenue}
                className={`w-[84px] shrink-0 rounded-lg p-2.5 text-left transition-all active:scale-95 ${
                  venue === activeVenue
                    ? "border-2 border-[#FF6B9D] bg-[#FFF1F6]"
                    : "border border-gray-200 bg-white"
                }`}
              >
                <p
                  className={`truncate text-[12px] font-bold leading-tight ${
                    venue === activeVenue ? "text-[#FF6B9D]" : "text-gray-600"
                  }`}
                >
                  {venue}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      {mapEvent && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="-mx-3">
            <div className="px-3">
              <Image
                src="/images/arena-prediction/seat-report-map-logo.png"
                alt="みんなの座席報告マップ"
                width={2396}
                height={232}
                className="h-[40px] w-auto max-w-full object-contain"
              />
            </div>

            <div className="mt-3 flex gap-1 px-3">
              {COLOR_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setColorMode(tab.value)}
                  className={`flex-1 rounded-xl py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                    colorMode === tab.value
                      ? "bg-[#FF6B9D] text-white"
                      : "border border-gray-200 bg-white text-[#111827]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <ArenaReportMap
              eventId={mapEvent.id}
              reports={mapEvent.reports}
              variant="full"
              hideShareSection
              mapFullBleed
              colorModeExternal={colorMode}
            />
          </div>
        </div>
      )}
      <div className="mt-3 rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
        <div className="relative mx-auto h-[140px] w-full max-w-[280px]">
          <Image src="/images/artist-page/seat-map-preparing2.png" alt="準備中" fill className="object-contain" />
        </div>
      </div>
      {mapEvent && detailHref && (
        <Link
          href={detailHref}
          className="mx-auto mt-3 flex h-12 w-[76%] items-center justify-center rounded-full bg-[#FF6B9D] text-[17px] font-bold text-white shadow-sm no-underline"
        >
          詳しく見る
        </Link>
      )}
    </section>
  );
}
