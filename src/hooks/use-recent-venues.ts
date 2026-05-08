"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "recentVenues";
const MAX_RECENT = 10;

export function useRecentVenues() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

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
