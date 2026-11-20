"use client";

import { useEffect, useRef, type RefObject } from "react";
import { ArrowUp } from "lucide-react";
import styles from "./VenueFacilityFinder.module.css";

export function useFacilityResultNavigation(finder: RefObject<HTMLDivElement | null>) {
  const mapMarker = useRef<HTMLButtonElement | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const pending = useRef<number | null>(null);

  useEffect(() => () => {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
  }, []);

  function reveal(target: () => HTMLElement | null, block: ScrollLogicalPosition = "start") {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => {
      pending.current = null;
      const element = target();
      if (!element?.isConnected) return;
      element.focus({ preventScroll: true });
      const rect = element.getBoundingClientRect();
      if ((block === "start" && window.innerWidth <= 767) || rect.top < 76 || rect.bottom > window.innerHeight - 48) {
        element.scrollIntoView({ block, behavior: "instant" });
      }
    });
  }
  function openList(trigger: HTMLButtonElement) {
    mapMarker.current = trigger;
    reveal(() => finder.current?.querySelector<HTMLElement>("[data-facility-area-results-heading]") ?? null);
  }
  function openDetail(trigger?: HTMLButtonElement | null) {
    detailTrigger.current = trigger ?? null;
    reveal(() => finder.current?.querySelector<HTMLElement>("[data-facility-detail-heading]") ?? null);
  }
  function backToList() {
    reveal(() => detailTrigger.current?.isConnected ? detailTrigger.current : finder.current?.querySelector<HTMLElement>("[data-facility-area-results-heading]") ?? null, "center");
  }
  function backToMap() {
    reveal(() => mapMarker.current?.isConnected ? mapMarker.current : finder.current?.querySelector<HTMLElement>("[data-facility-map-panel]") ?? null, "center");
  }
  return { openList, openDetail, backToList, backToMap };
}

export function FacilityAreaResultsHeading({ count, area, onReturn }: {
  count: number; area?: string | null; onReturn: () => void;
}) {
  return <div className={`${styles.panelHeading} ${styles.areaResultsHeading}`}>
    <div>
      <h3 tabIndex={-1} data-facility-area-results-heading>この場所の設備 {count}件</h3>
      {area && <p>{area}</p>}
    </div>
    <button type="button" onClick={onReturn}><ArrowUp size={14} aria-hidden="true" />地図へ戻る</button>
  </div>;
}
