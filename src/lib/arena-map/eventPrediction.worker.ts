import { inferEventPrediction } from "./eventPrediction";
import { isEventPredictionEnabled, type EventPredictionInput } from "./eventPredictionInput";
import type { PredictionV5 } from "./patternInferenceV5";

export type EventPredictionResponse = { key: string; result: PredictionV5 } | { key: string; error: string };
self.addEventListener("message", (event: MessageEvent<EventPredictionInput>) => {
  const input = event.data;
  try {
    if (!isEventPredictionEnabled(input.eventId)) throw new Error("Prediction is disabled");
    self.postMessage({ key: input.key, result: inferEventPrediction(input) } satisfies EventPredictionResponse);
  } catch {
    self.postMessage({ key: input.key, error: "予想を作れませんでした" } satisfies EventPredictionResponse);
  }
});
