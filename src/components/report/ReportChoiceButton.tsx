"use client";

import type { ReactNode } from "react";

type ReportChoiceButtonProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  xs?: boolean;
};

/** 当落・現地レポで共通利用する選択肢ボタン。 */
export function ReportChoiceButton({
  selected,
  onClick,
  children,
  xs = false,
}: ReportChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-report-choice
      className={`zr-focus min-h-11 w-full border transition-colors ${xs ? "text-[10px]" : "text-[11px]"} ${
        selected
          ? "border-[#f43679] bg-[#f43679] font-black text-white"
          : "border-[#ded8dc] bg-white font-black text-[#544e52]"
      }`}
    >
      {children}
    </button>
  );
}
