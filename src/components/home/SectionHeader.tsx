import type { ReactNode } from "react";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  moreHref?: string;
}

export default function SectionHeader({
  icon,
  title,
  moreHref = "#",
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <h2 className="text-[15px] font-extrabold text-gray-900">{title}</h2>
      </div>
      <a
        href={moreHref}
        className="text-xs font-semibold transition-colors"
        style={{ color: "#FF6B9D" }}
      >
        もっと見る &gt;
      </a>
    </div>
  );
}
