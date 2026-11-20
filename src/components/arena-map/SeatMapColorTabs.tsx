"use client";

import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { SegmentedControl } from "@/components/common/SegmentedControl";

const COLOR_TABS: { value: ColorMode; label: string }[] = [
  { value: "lottery", label: "抽選回" },
  { value: "fcHistory", label: "FC歴" },
  { value: "payment", label: "支払い" },
  { value: "upgrade", label: "アップ\nグレード" },
];

type SeatMapColorTabsProps = {
  value: ColorMode;
  onChange: (value: ColorMode) => void;
  className?: string;
};

/** 座席マップの色分けを切り替える、全ページ共通のコンパクトタブ。 */
export function SeatMapColorTabs({ value, onChange, className }: SeatMapColorTabsProps) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={COLOR_TABS}
      ariaLabel="座席報告の色分け"
      tone="seat"
      compact
      className={`${className ?? ""} [&_span]:whitespace-pre-line [&_span]:leading-tight [&_button]:text-[11px]`}
    />
  );
}
