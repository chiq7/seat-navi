"use client";

import { useEffect, useState } from "react";

/** Recheck on arrival, at the data's refresh interval, and on return to the tab. */
export function useFreshPublicData<T>(path: string | undefined, seconds: number, initial: T) {
  const [fresh, setFresh] = useState<{ path: string; data: T; staleAt: string | null }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    const endpoint: string = path;
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (document.hidden || loading) return;
      loading = true;
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Public data request failed");
        const data = await response.json() as T;
        const updatedAt = response.headers.get("X-Tixrepo-Data-Updated-At");
        const staleAt = response.headers.get("X-Tixrepo-Data-Stale") === "1" && updatedAt
          && Number.isFinite(Date.parse(updatedAt)) ? updatedAt : null;
        if (!controller.signal.aborted) {
          setFresh({ path: endpoint, data, staleAt });
          setFailed(false);
        }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        loading = false;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [path, seconds, attempt]);

  const current = fresh?.path === path ? fresh : undefined;
  return {
    data: current?.data ?? initial,
    staleAt: current?.staleAt ?? null,
    failed,
    retry: () => setAttempt(value => value + 1),
  };
}
