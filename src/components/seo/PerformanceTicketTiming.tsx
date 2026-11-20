"use client";

import { useEffect, useRef } from "react";
import { getPerformanceTicketTiming } from "@/data/performanceTicketTimings";
import type { CrawledEvent } from "@/lib/types";
import styles from "./SearchContentGuides.module.css";

export default function PerformanceTicketTiming({ event }: { event: CrawledEvent }) {
  const timing = getPerformanceTicketTiming(event);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!timing) return;
    let frame = 0;
    const reveal = () => {
      if (window.location.hash !== "#performance-ticket-timing") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => section.current?.scrollIntoView({ block: "start" }));
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", reveal);
    };
  }, [timing]);
  if (!timing) return null;
  const rows = [
    ["チケット受取", timing.receive],
    ["座席番号の表示", timing.seat],
  ] as const;
  return <div className="zr-container"><section ref={section} id="performance-ticket-timing" aria-labelledby="performance-ticket-timing-title" className={`${styles.section} scroll-mt-[90px]`}>
    <h2 id="performance-ticket-timing-title">チケット受取・座席表示</h2>
    <p className="text-sm font-bold">{timing.scope}</p>
    <dl className="mt-3 grid gap-3">
      {rows.map(([label, value]) => <div key={label}>
        <dt className="text-xs font-bold text-[#665861]">{label}</dt>
        <dd className="mt-1 text-sm font-bold leading-6 text-[#493840]">{value.dateTime ? <time dateTime={value.dateTime}>{value.label}</time> : value.label}</dd>
      </div>)}
    </dl>
    <a href={timing.source.url} target="_blank" rel="noopener noreferrer" className={`${styles.link} zr-focus`}>{timing.source.name} ↗</a>
  </section></div>;
}

