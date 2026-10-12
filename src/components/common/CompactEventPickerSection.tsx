"use client";

import type { ReactNode } from "react";
import {
  EventCarouselPicker,
  type EventCarouselPickerProps,
  type PickerEvent,
} from "@/components/common/EventPicker";

type CompactEventPickerSectionProps<T extends PickerEvent> =
  EventCarouselPickerProps<T> & {
    headingId: string;
    title: string;
    side?: ReactNode;
    footer?: ReactNode;
    sectionClassName?: string;
  };

/** 公演を切り替えるページで共通利用する、スマホ優先のコンパクトな選択セクション。 */
export function CompactEventPickerSection<T extends PickerEvent>({
  headingId,
  title,
  side,
  footer,
  sectionClassName,
  className,
  ...pickerProps
}: CompactEventPickerSectionProps<T>) {
  return (
    <section
      className={`zr-container py-4 sm:py-5 ${sectionClassName ?? ""}`}
      aria-labelledby={headingId}
      data-compact-event-picker
    >
      <div className="flex min-h-7 items-center justify-between gap-4">
        <h2
          id={headingId}
          className="text-[18px] font-black tracking-[-0.035em] text-[#40383d] sm:text-[20px]"
        >
          {title}
        </h2>
        {side ? <div className="shrink-0">{side}</div> : null}
      </div>

      <EventCarouselPicker
        {...pickerProps}
        inputId={`${headingId}-select`}
        className={`mt-3 ${className ?? ""}`}
      />
      {footer}
    </section>
  );
}
