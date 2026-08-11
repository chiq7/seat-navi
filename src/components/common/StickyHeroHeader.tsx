"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";

type StickyHeroHeaderProps = {
  title: string;
  backLabel: string;
  backHref?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

const backControlClass =
  "zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0f5] text-[#665761] transition-colors active:bg-[#ffe3ed]";

export function StickyHeroHeader({
  title,
  backLabel,
  backHref,
  onBack,
  rightSlot,
}: StickyHeroHeaderProps) {
  const backControl = onBack ? (
    <button type="button" onClick={onBack} aria-label={backLabel} className={backControlClass}>
      <ChevronLeft size={24} strokeWidth={2.5} aria-hidden="true" />
    </button>
  ) : (
    <Link href={backHref ?? "/"} aria-label={backLabel} className={backControlClass}>
      <ChevronLeft size={24} strokeWidth={2.5} aria-hidden="true" />
    </Link>
  );

  return (
    <>
      <header
        data-sticky-hero-header
        className="fixed inset-x-0 top-0 z-[60] h-14 border-b border-[#f0dde5] bg-white/90 shadow-[0_4px_18px_rgba(111,78,91,0.06)] backdrop-blur-xl sm:h-16"
      >
        <div className="zr-container grid h-full grid-cols-[88px_minmax(0,1fr)_88px] items-center">
          <div className="flex justify-start">{backControl}</div>
          <p className="truncate px-1 text-center text-[13px] font-black tracking-[-0.02em] text-[#4b4148] sm:text-[14px]">
            {title}
          </p>
          <div className="flex justify-end">{rightSlot ?? <AccountLink iconSize={22} />}</div>
        </div>
      </header>
      <div aria-hidden="true" className="h-14 sm:h-16" />
    </>
  );
}
