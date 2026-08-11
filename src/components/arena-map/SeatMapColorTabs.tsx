"use client";

import { Crown, Sparkles, Ticket, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";

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
    <div
      className={`grid grid-cols-4 overflow-hidden border border-[#ded8dc] bg-white ${className ?? ""}`}
      role="group"
      aria-label="座席報告の色分け"
    >
      {COLOR_TABS.map(({ value: tabValue, label, Icon }) => {
        const selected = value === tabValue;
        return (
          <button
            key={tabValue}
            type="button"
            onClick={() => onChange(tabValue)}
            aria-pressed={selected}
            className={`zr-focus flex min-h-12 min-w-0 items-center justify-center gap-1 border-r border-[#ded8dc] px-1 text-[9px] font-black transition-colors last:border-r-0 sm:gap-2 sm:text-[11px] ${
              selected
                ? "bg-[#eef0ff] text-[#5165c6]"
                : "bg-white text-[#625a61] hover:bg-[#fff0f5]"
            }`}
          >
            <Icon
              size={15}
              strokeWidth={1.8}
              className={`shrink-0 ${selected ? "text-[#6176d7]" : "text-[#9b91a0]"}`}
              aria-hidden="true"
            />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
