import { isEventPredictionEnabled } from "./eventPredictionInput";

/** Only the view emitted after a compatible candidate has actually rendered. */
export type PredictionView = { prediction: boolean; candidate?: string; date?: string };

export function predictionDetailHref(eventId: string, view?: PredictionView, environment = process.env.NODE_ENV) {
  const base = `/events/${encodeURIComponent(eventId)}`;
  if (!isEventPredictionEnabled(eventId, environment) || !view?.prediction || !view.candidate) return `${base}#seat-map`;
  // Internal input keys, report IDs and exact seat addresses must never travel here.
  const query = new URLSearchParams({ seat_view: "prediction", seat_candidate: view.candidate });
  return `${base}?${query}#seat-map`;
}
