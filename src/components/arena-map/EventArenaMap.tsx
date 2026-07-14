"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download } from "lucide-react";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import type { SeatReport } from "@/lib/types";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { exportMapImageAsPng } from "@/lib/arena-map/exportMapImage";

export type EventArenaMapProps = {
  /** 保存ファイル名（seat-map-{eventId}.png）にも使う、現在表示中のevent id */
  eventId: string;
  reports: SeatReport[];
  /** 外部で色分けタブを制御する場合に指定。省略時はArenaReportMap内蔵のタブを使う。 */
  colorMode?: ColorMode;
  mapFullBleed?: boolean;
  /** 「マップ画像を保存」ボタンを表示するか */
  showSaveButton?: boolean;
  /** 保存成功時に呼ばれる（保存後の導線を親側で案内する用途） */
  onSaved?: () => void;
};

/**
 * ArenaReportMap本体 + 「マップ画像を保存」ボタンをまとめた共通部品。
 * SVG描画・座席色分け・SVG→Canvas→PNG保存（Safari/WebKit対応込み）は
 * ArenaReportMap / exportMapImageAsPng をそのまま再利用し、ここでは二重実装しない。
 */
export function EventArenaMap({
  eventId,
  reports,
  colorMode,
  mapFullBleed = false,
  showSaveButton = false,
  onSaved,
}: EventArenaMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  async function handleSaveMapImage() {
    if (!svgRef.current) return;
    try {
      await exportMapImageAsPng(svgRef.current, {
        scale: 2,
        filename: `seat-map-${eventId}.png`,
      });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error("マップ画像の保存に失敗しました", err);
    }
  }

  return (
    <>
      <ArenaReportMap
        eventId={eventId}
        reports={reports}
        variant="full"
        colorModeExternal={colorMode}
        hideShareSection
        mapFullBleed={mapFullBleed}
        svgRef={svgRef}
      />
      {showSaveButton && (
        <button
          type="button"
          onClick={handleSaveMapImage}
          className={`mx-auto -mt-2 flex h-10 items-center gap-1.5 rounded-full px-4 text-[12px] font-bold transition-all active:scale-95 ${
            saved
              ? "border border-green-500/40 bg-green-50 text-green-600"
              : "bg-[#FF6B9D] text-white shadow-[0_4px_14px_rgba(255,107,157,0.35)]"
          }`}
        >
          {saved ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              保存しました
            </>
          ) : (
            <>
              <Download size={14} strokeWidth={2.5} />
              この画像をスマホに保存する
            </>
          )}
        </button>
      )}
    </>
  );
}
