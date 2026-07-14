import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SeatReport } from "@/lib/types";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";

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

type Props = {
  mapEvent: MapEvent | null;
};

export default function MapPreviewSection({ mapEvent }: Props) {
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");

  if (!mapEvent) return null;

  return (
    <>
      <div className="border border-gray-100 bg-white px-3 pt-3 shadow-sm">
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

          {/* 区切り線: タイトル段 / ボタン・ナビ段 */}
          <div className="mt-3 border-t-2 border-gray-200" />

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

          {/* ArenaReportMap（共通部品: SVG描画・PNG保存はEventArenaMapが再利用） */}
          <EventArenaMap
            eventId={mapEvent.id}
            reports={mapEvent.reports}
            colorMode={colorMode}
            mapFullBleed
          />
        </div>
      </div>

      {/* 投稿ボタン（/events/[id]と同じ横長CTAデザイン） */}
      <Link
        href={`/events/${mapEvent.id}/fan-seat-prediction`}
        className="mt-1 flex h-9 w-full items-center justify-center rounded-xl bg-[#FF6B9D] text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,107,157,0.25)] transition-opacity active:opacity-80"
      >
        予想図を投稿する
      </Link>
    </>
  );
}
