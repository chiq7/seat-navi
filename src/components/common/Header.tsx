"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export type HeaderProps = {
  /** 中央に表示するタイトル。1行固定・省略記号あり */
  title: string;
  /** 戻る先URL。指定時はLinkとして遷移する */
  backHref?: string;
  /** 戻る動作をコールバックにしたい場合（backHrefより優先） */
  onBack?: () => void;
  /** 右側スロット。未指定でも幅は確保される */
  rightSlot?: ReactNode;
  className?: string;
};

/** 44px高さ・3スロット（戻る/タイトル/右要素）固定の共通ヘッダー */
export function Header({ title, backHref, onBack, rightSlot, className }: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-30 grid h-[44px] grid-cols-[44px_1fr_44px] items-center border-b border-gray-100 bg-white ${className ?? ""}`}
    >
      <div className="flex h-8 w-8 items-center justify-center justify-self-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            className="flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
        ) : null}
      </div>
      <h1 className="min-w-0 truncate px-1 text-center text-[13px] font-bold tracking-wide text-gray-900">
        {title}
      </h1>
      <div className="flex h-8 w-8 items-center justify-center justify-self-end">
        {rightSlot}
      </div>
    </header>
  );
}
