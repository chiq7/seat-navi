"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";
import { isBabyFacilitySearch, type VenueFacilitySearchTarget } from "@/lib/venueFacilitySearch";

export function useVenueFacilitySearchTarget(
  finder: RefObject<HTMLElement | null>,
  apply: (purpose: VenueFacilitySearchTarget) => boolean,
) {
  const open = useEffectEvent(apply);
  useEffect(() => {
    let frame = 0;
    function readHash() {
      const hash = window.location.hash;
      if (!hash.startsWith("#venue-")) return;
      const purpose = hash.slice("#venue-".length);
      const specific = isBabyFacilitySearch(purpose);
      if (!(purpose === "luggage" || purpose === "baby" || specific) || !open(purpose)) return;
      cancelAnimationFrame(frame);
      const deadline = performance.now() + 1800;
      function reveal() {
        const detail = specific ? finder.current?.querySelector<HTMLElement>("[data-facility-detail-heading]") : null;
        if (specific && !detail && performance.now() < deadline) {
          frame = requestAnimationFrame(reveal);
          return;
        }
        detail?.focus({ preventScroll: true });
        (detail ?? finder.current)?.scrollIntoView({ block: detail ? "center" : "start", behavior: "instant" });
      }
      frame = requestAnimationFrame(reveal);
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => {
      window.removeEventListener("hashchange", readHash);
      cancelAnimationFrame(frame);
    };
  }, [finder]);
}

