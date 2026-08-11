import type { ReactNode } from "react";

type CompactHeroIntroProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** アーティストTOP以外で使う、機能名が1行で伝わるコンパクトなヒーロー本文。 */
export function CompactHeroIntro({
  title,
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
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? <div className="shrink-0" aria-hidden="true">{icon}</div> : null}
        <h1 className="min-w-0 whitespace-nowrap text-[clamp(22px,6.4vw,38px)] font-black leading-none tracking-[-0.055em] text-[#40383d]">
          {title}
        </h1>
      </div>
      {subtitle ? (
        <p className="mt-2 truncate text-[11px] font-bold text-[#746a71] sm:text-[12px]">
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
