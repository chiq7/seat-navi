"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { AccountLink } from "@/components/auth/AccountLink";

const backControlClass =
  "zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-accent-light text-foreground transition-colors active:bg-accent/15";

const titleClass =
  "truncate px-1 text-center text-[13px] font-black tracking-[-0.02em] text-foreground sm:text-[14px]";

export type HeaderProps = {
  /** 中央に表示するタイトル。1行固定・省略記号あり */
  title: string;
  /** 戻る先URL。指定時はLinkとして遷移する */
  backHref?: string;
  /** 戻る動作をコールバックにしたい場合（backHrefより優先） */
  onBack?: () => void;
  /** 戻る操作を読み上げるラベル */
  backLabel?: string;
  /** 右側スロット。未指定でも幅は確保される */
  rightSlot?: ReactNode;
  /** 未指定時にマイページ導線を表示する */
  showAccount?: boolean;
  /** 本文側にh1がない静的ページで中央タイトルをh1にする */
  titleAsHeading?: boolean;
  className?: string;
};

/** 全ページ共通の追従ヘッダー。本文位置を保つスペーサーを含む。 */
export function Header({
  title,
  backHref,
  onBack,
  backLabel = "前のページへ戻る",
  rightSlot,
  showAccount = true,
  titleAsHeading = false,
  className,
}: HeaderProps) {
  return (
    <>
      <header
        data-page-header
        className={`fixed inset-x-0 top-0 z-[60] h-14 border-b border-divider bg-white/90 shadow-[0_4px_18px_rgba(58,58,62,0.06)] backdrop-blur-xl sm:h-16 ${className ?? ""}`}
      >
        <div className="zr-container grid h-full grid-cols-[88px_minmax(0,1fr)_88px] items-center">
          <div className="flex justify-start">
            {onBack ? (
              <button type="button" onClick={onBack} aria-label={backLabel} className={backControlClass}>
                <ChevronLeft size={24} strokeWidth={2.5} aria-hidden="true" />
              </button>
            ) : backHref ? (
              <Link href={backHref} aria-label={backLabel} className={backControlClass}>
                <ChevronLeft size={24} strokeWidth={2.5} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          {titleAsHeading ? (
            <h1 className={titleClass}>{title}</h1>
          ) : (
            <p className={titleClass}>{title}</p>
          )}
          <div className="flex justify-end">{rightSlot ?? (showAccount ? <AccountLink iconSize={22} /> : null)}</div>
        </div>
      </header>
      <div aria-hidden="true" className="h-14 sm:h-16" />
    </>
  );
}
