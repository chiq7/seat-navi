import Link from "next/link";
import { eventTourDateLinks } from "@/lib/eventTourDates";
import type { CrawledEvent } from "@/lib/types";

export function EventTourDates({ event, related }: { event: CrawledEvent; related: readonly CrawledEvent[] }) {
  const links = eventTourDateLinks(event, related);
  if (!links.length) return null;
  return <nav aria-label="同じツアーの別日程" data-event-tour-dates className="zr-container mt-4">
    <p className="mb-2 text-sm font-bold text-[#55464e]">同じツアーの別日程</p>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2">
      {links.map(link => <Link key={link.id} href={`/events/${encodeURIComponent(link.id)}`} prefetch={false}
        data-tour-date={link.direction}
        className="zr-focus flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-[#d9b8c6] bg-white px-3 py-2 text-sm font-bold leading-snug text-[#80294f]">
        <span>{link.direction === "previous" && <span aria-hidden="true">← </span>}{link.label}{link.direction === "next" && <span aria-hidden="true"> →</span>}</span>
        <span className="mt-1 text-xs font-medium text-[#6e6068]">{link.detail}</span>
      </Link>)}
    </div>
  </nav>;
}
