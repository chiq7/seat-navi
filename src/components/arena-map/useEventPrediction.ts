"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPredictionJobs, idlePrediction } from "@/lib/arena-map/eventPredictionJobs";
import type { EventPredictionInput } from "@/lib/arena-map/eventPredictionInput";

const jobs = createPredictionJobs(() => new Worker(new URL("../../lib/arena-map/eventPrediction.worker.ts", import.meta.url), { type: "module" }));
export function useEventPrediction(input: EventPredictionInput, enabled: boolean) {
  const subscribe = useCallback((listener: () => void) => enabled ? jobs.subscribe(input, listener) : () => {}, [input, enabled]);
  const getSnapshot = useCallback(() => enabled ? jobs.get(input.key) : idlePrediction, [input.key, enabled]);
  return useSyncExternalStore(subscribe, getSnapshot, () => idlePrediction);
}
