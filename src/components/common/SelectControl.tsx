import type { ChangeEventHandler, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type SelectControlProps = {
  id?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
  className?: string;
  selectClassName?: string;
  variant?: "field" | "bare";
  tone?: "neutral" | "seat";
  disabled?: boolean;
  wrappedValue?: string;
};

const fieldClass =
  "zr-focus h-11 w-full appearance-none rounded-[12px] border border-[#e4d9df] bg-white px-3 pr-9 text-[12px] font-black tracking-[-0.01em] text-[#4b4148] outline-none transition-colors focus:border-[#f43679] disabled:cursor-not-allowed disabled:opacity-50";

const bareClass =
  "zr-focus h-11 w-full appearance-none border-0 bg-transparent pr-9 text-[12px] font-black tracking-[-0.01em] outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function SelectControl({
  id,
  value,
  onChange,
  children,
  className,
  selectClassName,
  variant = "field",
  tone = "neutral",
  disabled = false,
  wrappedValue,
}: SelectControlProps) {
  const toneClass = tone === "seat" ? "text-[#5165c6]" : "text-[#665761]";

  return (
    <span className={`relative block min-w-0 ${wrappedValue ? "rounded-md focus-within:outline-2 focus-within:outline-[#922753]" : ""} ${className ?? ""}`}>
      {wrappedValue && <span aria-hidden="true" className="flex min-h-11 items-center pr-9 text-[13px] font-black leading-[1.45] text-[#665761]">
        <span data-selected-performance className="line-clamp-2 break-words">{wrappedValue}</span>
      </span>}
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${variant === "field" ? fieldClass : bareClass} ${toneClass} ${selectClassName ?? ""} ${wrappedValue ? "absolute inset-0 size-full cursor-pointer opacity-0" : ""}`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={2}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${toneClass}`}
        aria-hidden="true"
      />
    </span>
  );
}
