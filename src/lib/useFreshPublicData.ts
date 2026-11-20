"use client";

import { useEffect, useState } from "react";
import { fetchFreshPublicData } from "./publicDataRefresh";

/** Recheck on arrival, at the data's refresh interval, and on return to the tab. */
export function useFreshPublicData<T>(path: string | undefined, seconds: number, initial: T) {
  const [fresh, setFresh] = useState<{ path: string; data: T; staleAt: string | null; checkedAt: string; updatedAt: string | null }>();
  const [status, setStatus] = useState<{ path: string; failed: boolean; refreshing: boolean }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    const endpoint: string = path;
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (document.hidden || loading) return;
      loading = true;
      setStatus({ path: endpoint, failed: false, refreshing: true });
      try {
        const result = await fetchFreshPublicData<T>(endpoint, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setFresh({ path: endpoint, ...result });
          setStatus({ path: endpoint, failed: false, refreshing: false });
        }
      } catch {
        if (!controller.signal.aborted) setStatus({ path: endpoint, failed: true, refreshing: false });
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
  const currentStatus = status?.path === path ? status : undefined;
  return {
    data: current?.data ?? initial,
    staleAt: current?.staleAt ?? null,
    lastSuccessAt: current?.checkedAt ?? null,
    updatedAt: current?.updatedAt ?? null,
    failed: currentStatus?.failed ?? false,
    refreshing: currentStatus?.refreshing ?? false,
    retry: () => setAttempt(value => value + 1),
  };
}
