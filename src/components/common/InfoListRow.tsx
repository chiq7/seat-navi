import type { ReactNode } from "react";
import Link from "next/link";

type InfoListRowProps = {
  href: string;
  children: ReactNode;
  ariaLabel?: string;
  external?: boolean;
  className?: string;
};

const rowClass =
  "zr-focus group grid min-h-[84px] min-w-0 grid-cols-[72px_minmax(0,1fr)_18px] items-center gap-3 border-b border-[#ded8dc] px-0 py-3 no-underline transition-colors hover:bg-[#fff8fa] sm:grid-cols-[110px_minmax(0,1fr)_22px] sm:px-4";

/** 日付・本文・遷移先を持つ一覧用の共通行。リンク先の種類だけを切り替える。 */
export function InfoListRow({ href, children, ariaLabel, external = false, className }: InfoListRowProps) {
  const classes = `${rowClass} ${className ?? ""}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={classes}
        data-info-list-row="external"
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={classes} data-info-list-row="internal">
      {children}
    </Link>
  );
}
