"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { AccountLink } from "@/components/auth/AccountLink";

export type HeaderProps = {
  /** 中央に表示するタイトル。1行固定・省略記号あり */
  title: string;
  /** 戻る先URL。指定時はLinkとして遷移する */
  backHref?: string;
  /** 戻る動作をコールバックにしたい場合（backHrefより優先） */
  onBack?: () => void;
  /** 右側スロット。未指定でも幅は確保される */
  rightSlot?: ReactNode;
  /** 未指定時にマイページ導線を表示する */
  showAccount?: boolean;
  className?: string;
};

/** 3スロット（戻る/タイトル/右要素）の共通ページヘッダー */
export function Header({ title, backHref, onBack, rightSlot, showAccount = true, className }: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 grid h-14 grid-cols-[44px_1fr_44px] items-center border-b border-[#f0e2e8] bg-white/95 px-2 backdrop-blur-xl ${className ?? ""}`}
    >
      <div className="flex h-11 w-11 items-center justify-center justify-self-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="zr-focus flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0f5] text-[#6b5862] active:bg-[#ffe2ec]"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            className="zr-focus flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0f5] text-[#6b5862] active:bg-[#ffe2ec]"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
        ) : null}
      </div>
      <h1 className="min-w-0 truncate px-2 text-center text-[14px] font-black tracking-[-0.02em] text-[#2b252b]">
        {title}
      </h1>
      <div className="flex h-11 w-11 items-center justify-center justify-self-end">
        {rightSlot ?? (showAccount ? <AccountLink iconSize={19} /> : null)}
      </div>
    </header>
  );
}
