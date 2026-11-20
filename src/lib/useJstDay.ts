"use client";

import { useSyncExternalStore } from "react";
import { getJstDateString } from "./artistPageData";

function subscribe(notify: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    clearTimeout(timer);
    notify();
    const day = 86_400_000;
    timer = setTimeout(schedule, day - (Date.now() + 9 * 3_600_000) % day + 10);
  };
  schedule();
  document.addEventListener("visibilitychange", schedule);
  return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
}

/** Update an open page at midnight in Japan, including after a sleeping tab resumes. */
export function useJstDay(initialDay?: string) {
  return useSyncExternalStore(subscribe, getJstDateString, () => initialDay ?? getJstDateString());
}
