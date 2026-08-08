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
    <div className="mb-5 flex items-center gap-3 sm:mb-7">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0f5]">{icon}</span>
      <h2 className="text-[25px] font-black tracking-[-0.05em] text-[#2b252b] sm:text-[34px]">{title}</h2>
    </div>
  );
}
