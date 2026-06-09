import type { ReactNode } from "react";
import { COMPACT_BUTTON_CLS, DEFAULT_STYLE, SELECTED_STYLE } from "./constants";

export function formatEventDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, day).getDay()];
  return `${year}年${month}月${day}日(${weekday})`;
}

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-3 shadow-sm ${className}`}>{children}</div>;
}

export function CompactButton({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={COMPACT_BUTTON_CLS}
      style={selected ? SELECTED_STYLE : DEFAULT_STYLE}
    >
      {children}
    </button>
  );
}

export function CompactGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
      <span className="shrink-0 text-[10px] font-bold leading-none text-gray-500">{label}</span>
      <div className="grid min-w-0 flex-1 grid-flow-col auto-cols-fr gap-1">{children}</div>
    </div>
  );
}
