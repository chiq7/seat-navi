"use client";

import type { ReactNode } from "react";
import { TOKYO_DOME_ACCESS_EVENT } from "@/lib/tokyoDomeAccess";

export default function TokyoDomeStationLink({ stationId, className, label, children }: { stationId: string; className: string; label: string; children: ReactNode }) {
  return <a href="#dome-outside-map" className={className} aria-label={label} onClick={event => {event.preventDefault();window.dispatchEvent(new CustomEvent(TOKYO_DOME_ACCESS_EVENT, {detail:stationId}));}}>{children}</a>;
}
