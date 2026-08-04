import type { ReactNode } from "react";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
}

export default function SectionHeader({
  icon,
  title,
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-5 sm:mb-8">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[#f43679]">
          {icon}
          <span className="text-[10px] font-black tracking-[0.22em]">TIXREPO NOW</span>
        </div>
        <h2 className="text-[28px] font-black tracking-[-0.04em] text-[#1c171b] sm:text-[38px]">{title}</h2>
      </div>
    </div>
  );
}
