import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  actionExternal?: boolean;
  actionTone?: "primary" | "secondary";
  className?: string;
};

/** 情報0件を、短い説明と操作1つだけで伝える共通表示。 */
export function EmptyState({
  title,
  description,
  icon,
  actionHref,
  actionLabel,
  actionIcon,
  actionExternal = false,
  actionTone = "secondary",
  className,
}: EmptyStateProps) {
  const actionClass = actionTone === "primary"
    ? "bg-accent text-white"
    : "border border-divider bg-white text-foreground";
  const actionContent = (
    <>
      {actionIcon}
      <span>{actionLabel}</span>
    </>
  );
  const action = actionHref && actionLabel
    ? actionExternal
      ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`zr-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[11px] font-black ${actionClass}`}
          >
            {actionContent}
          </a>
        )
      : (
          <Link
            href={actionHref}
            className={`zr-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[11px] font-black ${actionClass}`}
          >
            {actionContent}
          </Link>
        )
    : null;

  return (
    <div
      className={`flex min-h-[104px] items-center gap-3 border-y border-dashed border-divider bg-white px-4 py-4 ${action ? "justify-between" : "justify-center text-center"} ${className ?? ""}`}
      data-empty-state
    >
      <div className={`min-w-0 ${action ? "text-left" : "text-center"}`}>
        {icon ? <div className={`mb-1.5 text-accent ${action ? "" : "flex justify-center"}`}>{icon}</div> : null}
        <p className="text-[14px] font-black leading-5 text-foreground">{title}</p>
        {description ? <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-4 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
