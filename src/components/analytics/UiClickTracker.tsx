"use client";

import { useEffect } from "react";
import { trackUi, uiNameFor } from "@/lib/uiAnalytics";

/** One listener for the whole site: a press on a known button is sent to GA4 as ui_click (see uiAnalytics). */
export function UiClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const name = uiNameFor(event.target instanceof Element ? event.target : null);
      if (name) trackUi(name);
    };
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
