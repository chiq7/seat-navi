"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "recentVenues";
const MAX_RECENT = 10;

export function useRecentVenues() {
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const addRecent = useCallback((venueId: string) => {
    setRecentIds((prev) => {
      const next = [venueId, ...prev.filter((id) => id !== venueId)].slice(
        0,
        MAX_RECENT
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { recentIds, addRecent };
}
