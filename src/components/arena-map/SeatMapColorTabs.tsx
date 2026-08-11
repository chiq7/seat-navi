"use client";

import { Crown, Sparkles, Ticket, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { SegmentedControl } from "@/components/common/SegmentedControl";

const COLOR_TABS: { value: ColorMode; label: string; Icon: LucideIcon }[] = [
  { value: "lottery", label: "抽選回", Icon: Ticket },
  { value: "fcHistory", label: "FC歴", Icon: Crown },
  { value: "payment", label: "支払い", Icon: WalletCards },
  { value: "upgrade", label: "アプグレ", Icon: Sparkles },
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
      className={className}
    />
  );
}
