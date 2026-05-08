"use client";

import { starRating } from "@/lib/utils";

type ScreenshotWatermarkProps = {
  eventName: string;
  updatedAt?: string;     // 相対でもOK
  atsumariScore: number;
  danketsuGauge: string;  // "■■■□□"
  danketsuLv: number;
};

/**
 * スクショ共有前提の透かし情報
 * マップ・カード下部に固定表示
 * 件数は絶対に出さない
 */
export function ScreenshotWatermark({
  eventName,
  updatedAt,
  atsumariScore,
  danketsuGauge,
  danketsuLv,
}: ScreenshotWatermarkProps) {
  const relativeTime = updatedAt ?? "さっき更新";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-gray-50/80 px-3 py-2 text-[10px] text-gray-400">
      <span className="font-medium text-gray-500">{eventName}</span>
      <span>·</span>
      <span>{relativeTime}</span>
      <span>·</span>
      <span>集まり度 {starRating(atsumariScore)}</span>
      <span>·</span>
      <span>団結Lv {danketsuGauge} Lv.{danketsuLv}</span>
    </div>
  );
}
