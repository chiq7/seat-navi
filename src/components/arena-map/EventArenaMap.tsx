"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Download } from "lucide-react";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import type { SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
import type { SeatPosition } from "@/lib/arena-map/arenaSeatDetails";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { renderMapImageAsPngBlob, downloadPngBlob } from "@/lib/arena-map/exportMapImage";
import { EventPredictionSwitch } from "./EventPredictionSwitch";
import type { SeatAddress } from "@/lib/arena-map/layoutModel";
import { isEventPredictionEnabled } from "@/lib/arena-map/eventPredictionInput";
import type { PredictionView } from "@/lib/arena-map/predictionNavigation";

export type EventArenaMapProps = {
  /** 保存ファイル名（seat-map-{eventId}.png）にも使う、現在表示中のevent id */
  eventId: string;
  reports: SeatReport[];
  externalObservations?: ExternalSeatObservation[];
  /** 外部で色分けタブを制御する場合に指定。省略時はArenaReportMap内蔵のタブを使う。 */
  colorMode?: ColorMode;
  mapFullBleed?: boolean;
  /** 「マップ画像を保存」ボタンを表示するか */
  showSaveButton?: boolean;
  /** 保存成功時に呼ばれる（保存後の導線を親側で案内する用途） */
  onSaved?: () => void;
  /** Local verification may inspect the same PNG sent to the existing downloader. */
  onSavedImage?: (image: Blob) => void;
  interactive?: boolean;
  detailEvents?: { id: string; date: string }[];
  initialSeat?: SeatPosition;
  unverifiedConditions?: boolean;
  predictionReadState?: "ready" | "unavailable";
  predictionLimited?: boolean;
  initialPrediction?: boolean;
  initialCandidate?: string;
  onPredictionViewChange?: (view: PredictionView) => void;
};
const NO_EXTERNAL: ExternalSeatObservation[] = [];
const NO_EVENTS: { id: string; date: string }[] = [];

/**
 * ArenaReportMap本体 + 「マップ画像を保存」ボタンをまとめた共通部品。
 * SVG描画・座席色分け・SVG→Canvas→PNG保存（Safari/WebKit対応込み）は
 * ArenaReportMap / exportMapImageAsPng をそのまま再利用し、ここでは二重実装しない。
 */
export function EventArenaMap({
  eventId,
  reports,
  externalObservations = NO_EXTERNAL,
  colorMode,
  mapFullBleed = false,
  showSaveButton = false,
  onSaved,
  onSavedImage,
  interactive = false,
  detailEvents = NO_EVENTS,
  initialSeat,
  unverifiedConditions = false,
  predictionReadState = "ready",
  predictionLimited = false,
  initialPrediction = false,
  initialCandidate,
  onPredictionViewChange,
}: EventArenaMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const predictionSvgRef = useRef<SVGSVGElement>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatPosition | null>(initialSeat ?? null);
  const [predictionShown, setPredictionShown] = useState(false);
  const [saved, setSaved] = useState(false);
  const onViewChange = useCallback((view: PredictionView) => {
    setPredictionShown(view.prediction);
    // A different view/candidate has not been saved by the previous click.
    setSaved(false);
    onPredictionViewChange?.(view);
  }, [onPredictionViewChange]);
  const onAddressChange = useCallback((address?: SeatAddress) => setSelectedSeat(address
    ? { block: address.block, row: Number(address.row), seat: Number(address.seat) } : null), []);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  async function handleSaveMapImage() {
    const visibleSvg = predictionShown ? predictionSvgRef.current : svgRef.current;
    if (!visibleSvg) return;
    try {
      const image = await renderMapImageAsPngBlob(visibleSvg, {
        scale: 2,
      });
      downloadPngBlob(image, `${predictionShown ? "seat-prediction" : "seat-map"}-${eventId}.png`);
      setSaved(true);
      onSaved?.();
      onSavedImage?.(image);
    } catch (err) {
      console.error("マップ画像の保存に失敗しました", err);
    }
  }

  return (
    <>
      <EventPredictionSwitch eventId={eventId} reports={reports} external={externalObservations} events={detailEvents}
        address={selectedSeat ? { block: selectedSeat.block, row: String(selectedSeat.row), seat: String(selectedSeat.seat) } : undefined}
        onAddressChange={onAddressChange} svgRef={predictionSvgRef} onViewChange={onViewChange}
        readState={predictionReadState} limited={predictionLimited} initialPrediction={initialPrediction} initialCandidate={initialCandidate}>
        <ArenaReportMap
        eventId={eventId}
        reports={reports}
        externalObservations={externalObservations}
        variant="full"
        colorModeExternal={colorMode}
        hideShareSection
        mapFullBleed={mapFullBleed}
        svgRef={svgRef}
        explorePreview={interactive}
        seatDetailPreview={interactive}
        positionOnlyPreview={interactive || unverifiedConditions}
        seatConditionsUnverifiedPreview={unverifiedConditions}
        detailEvents={detailEvents}
        initialSeatPreview={initialSeat}
        selectionPreview={isEventPredictionEnabled(eventId) ? selectedSeat : undefined}
        onSeatSelectionChange={isEventPredictionEnabled(eventId) ? setSelectedSeat : undefined}
      />
      </EventPredictionSwitch>
      {showSaveButton && (
        <button
          type="button"
          onClick={handleSaveMapImage}
          className={`zr-focus mx-auto mt-2 flex min-h-11 items-center gap-2 border px-4 text-[11px] font-black transition-colors ${
            saved
              ? "border-green-500/40 bg-green-50 text-green-700"
              : "border-divider bg-white text-foreground hover:bg-[#fff3f7]"
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
              座席表を画像保存
            </>
          )}
        </button>
      )}
    </>
  );
}
