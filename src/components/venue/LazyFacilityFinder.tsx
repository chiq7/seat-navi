"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { TOKYO_DOME_ACCESS_EVENT } from "@/lib/tokyoDomeAccess";

const TokyoDomeGuideFinder = lazy(() => import("./TokyoDomeGuideFinder").then(module => ({ default: module.TokyoDomeGuideFinder })));

const FORWARDED_EVENTS = [TOKYO_DOME_ACCESS_EVENT, "venue-open-luggage"] as const;
const wantsFinderNow = () => /^#(?:venue-|dome-spots|dome-outside-map)/.test(window.location.hash);

/**
 * The facility finder is the heaviest part below the seat map (its data and maps are ~180KB of script
 * and ~450 elements). It loads when it scrolls into view, or as soon as something asks
 * for it (a facility link, a station "マップ" button), and replays that request once it is listening.
 */
export default function LazyFacilityFinder() {
  const holder = useRef<HTMLDivElement>(null);
  const pending = useRef<Event | null>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (wantsFinderNow()) { setLoad(true); return; }
    const element = holder.current;
    const observer = element && "IntersectionObserver" in window
      ? new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setLoad(true); }, { rootMargin: "0px" })
      : null;
    if (element && observer) observer.observe(element); else setLoad(true);
    const onHash = () => { if (wantsFinderNow()) setLoad(true); };
    const capture = (event: Event) => { pending.current = event; setLoad(true); };
    window.addEventListener("hashchange", onHash);
    for (const name of FORWARDED_EVENTS) window.addEventListener(name, capture);
    return () => {
      observer?.disconnect();
      window.removeEventListener("hashchange", onHash);
      for (const name of FORWARDED_EVENTS) window.removeEventListener(name, capture);
    };
  }, []);

  // Once the finder's own listeners are attached, hand it the request that triggered the load.
  const replay = useCallback(() => {
    const event = pending.current;
    pending.current = null;
    if (event) window.dispatchEvent(event instanceof CustomEvent ? new CustomEvent(event.type, { detail: event.detail }) : new Event(event.type));
  }, []);

  const placeholder = <div aria-busy="true" style={{ minHeight: 640, borderRadius: 16, background: "#fff7fa" }} />;
  return <div ref={holder}>
    {load ? <Suspense fallback={placeholder}><TokyoDomeGuideFinder onReady={replay} /></Suspense> : placeholder}
  </div>;
}
