import type { EventPredictionInput } from "./eventPredictionInput";
import type { PredictionV5 } from "./patternInferenceV5";
import type { EventPredictionResponse } from "./eventPrediction.worker";

export type PredictionSnapshot = { status: "idle" | "pending" | "ready" | "failed"; result?: PredictionV5 };
export const idlePrediction: PredictionSnapshot = Object.freeze({ status: "idle" });
type WorkerPort = Pick<Worker, "postMessage" | "terminate" | "onmessage" | "onerror">;
type Job = { snapshot: PredictionSnapshot; listeners: Set<() => void>; worker?: WorkerPort; timer?: ReturnType<typeof setTimeout> };

/** One lazy job per canonical input. Removing the last subscriber interrupts pending work. */
export function createPredictionJobs(createWorker: () => WorkerPort, timeoutMs = 12000) {
  const jobs = new Map<string, Job>();
  function stop(job: Job) {
    job.worker?.terminate(); job.worker = undefined;
    if (job.timer) clearTimeout(job.timer);
    job.timer = undefined;
  }
  function publish(job: Job, snapshot: PredictionSnapshot) {
    job.snapshot = snapshot;
    for (const listener of job.listeners) listener();
  }
  return {
    get(key: string) { return jobs.get(key)?.snapshot ?? idlePrediction; },
    subscribe(input: EventPredictionInput, listener: () => void) {
      if (input.state !== "ready") return () => {};
      let job = jobs.get(input.key);
      if (!job) {
        // Only evict unused entries, never another mounted consumer's calculation.
        for (const [key, old] of jobs) if (jobs.size >= 12 && !old.listeners.size) { stop(old); jobs.delete(key); }
        job = { snapshot: idlePrediction, listeners: new Set() }; jobs.set(input.key, job);
      }
      const current = job;
      current.listeners.add(listener);
      if (current.snapshot.status === "idle") {
        publish(current, { status: "pending" });
        try {
          const worker = createWorker(); current.worker = worker;
          worker.onmessage = (event: MessageEvent<EventPredictionResponse>) => {
            if (current.worker !== worker || event.data.key !== input.key) return;
            stop(current);
            publish(current, "result" in event.data ? { status: "ready", result: event.data.result } : { status: "failed" });
          };
          worker.onerror = () => { if (current.worker === worker) { stop(current); publish(current, { status: "failed" }); } };
          current.timer = setTimeout(() => { stop(current); publish(current, { status: "failed" }); }, timeoutMs);
          worker.postMessage(input);
        } catch { stop(current); publish(current, { status: "failed" }); }
      }
      return () => {
        current.listeners.delete(listener);
        if (!current.listeners.size && (current.snapshot.status === "pending" || current.snapshot.status === "failed")) {
          stop(current); current.snapshot = idlePrediction; jobs.delete(input.key);
        }
      };
    },
  };
}
