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
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <h2 className="text-[15px] font-extrabold text-gray-900">{title}</h2>
      </div>
    </div>
  );
}
