"use client";

import type { LucideIcon } from "lucide-react";

type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
  Icon?: LucideIcon;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  ariaLabel: string;
  className?: string;
  tone?: "pink" | "seat";
  compact?: boolean;
};

/** 1つだけ選ぶ表示切替用の共通コントロール。 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  tone = "pink",
  compact = false,
}: SegmentedControlProps<T>) {
  const selectedClass = tone === "seat"
    ? "bg-seat-soft text-seat"
    : "bg-accent text-white";
  const iconSelectedClass = tone === "seat" ? "text-seat" : "text-white";

  return (
    <div
      className={`grid overflow-hidden border border-divider bg-white ${className ?? ""}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(({ value: optionValue, label, Icon }, index) => {
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            aria-pressed={selected}
            className={`zr-focus flex min-h-11 min-w-0 items-center justify-center gap-1 px-1.5 font-black transition-colors ${
              index > 0 ? "border-l border-divider" : ""
            } ${compact ? "text-[9px] sm:gap-2 sm:text-[11px]" : "text-[12px]"} ${
              selected ? selectedClass : "bg-white text-foreground hover:bg-accent-light"
            }`}
          >
            {Icon ? (
              <Icon
                size={compact ? 15 : 16}
                strokeWidth={1.8}
                className={`shrink-0 ${selected ? iconSelectedClass : "text-muted"}`}
                aria-hidden="true"
              />
            ) : null}
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
