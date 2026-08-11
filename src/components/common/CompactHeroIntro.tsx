import type { ReactNode } from "react";

type CompactHeroIntroProps = {
  title: string;
  accent: string;
  eyebrow: string;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** アーティストTOP以外で使う、機能名が1行で伝わるコンパクトなヒーロー本文。 */
export function CompactHeroIntro({
  title,
  accent,
  eyebrow,
  subtitle,
  icon,
  children,
  className,
}: CompactHeroIntroProps) {
  return (
    <div
      className={`zr-container pb-6 pt-3 sm:pb-8 sm:pt-6 ${className ?? ""}`}
      data-compact-hero-intro
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-white/75 shadow-sm"
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#ef4f87]">
            {eyebrow}
          </p>
          <h1 className="mt-1 min-w-0 whitespace-nowrap text-[clamp(20px,6vw,36px)] font-black leading-none tracking-[-0.055em] text-[#40383d]">
            {title}<span className="text-[#ef4f87]">{accent}</span>
          </h1>
          {subtitle ? (
            <p className="mt-2 truncate text-[10px] font-bold text-[#746a71] sm:text-[12px]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
