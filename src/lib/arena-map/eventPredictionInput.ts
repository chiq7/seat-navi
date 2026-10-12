import type { SeatReport } from "../types";
import type { ExternalSeatObservation } from "../external-seats/types";
import { UNVERIFIED_TICKET_IDS } from "../ticketAnalyticsEligibility";
import { SEAT_MAP_PILOT_EVENT_IDS } from "./seatMapNavigation";
import { analyzeReports, type TimedSeatEvidence, type EvidenceAnalysis } from "./reportEvidence";
import type { EventLayoutDefinition } from "./eventPredictionLayout";

export const EVENT_PREDICTION_VERSION = "event-integration-v1";
export type PredictionEvent = { id: string; date: string };
export type EventPredictionInput = {
  key: string;
  eventId: string;
  eventIds: string[];
  date: string;
  analysis: EvidenceAnalysis;
  definitions: EventLayoutDefinition[];
  state: "ready" | "empty" | "unavailable" | "limited" | "unsupported";
};
export function isEventPredictionEnabled(eventId: string, environment = process.env.NODE_ENV) {
  return environment === "development" && SEAT_MAP_PILOT_EVENT_IDS.includes(eventId);
}

/** Provenance labels never copy stored lottery defaults into a resale observation. */
export function seatPredictionEvidence(reports: SeatReport[], external: ExternalSeatObservation[]): TimedSeatEvidence[] {
  return [
    ...reports.map(report => ({ id: report.id, eventId: report.event_id, block: report.block,
      row: String(report.row_num), seat: String(report.seat_num), precision: "exact" as const,
      availableAt: report.created_at, source: UNVERIFIED_TICKET_IDS.has(report.id) ? "seat-record" as const : "fan-report" as const,
      sourceRef: `seat_reports:${report.id}` })),
    ...external.filter(item => item.review_status === "approved" && item.seat_area === "arena").map(item => ({
      id: item.id, eventId: item.event_id, block: item.block ?? "", row: item.row_min == null ? "" : String(item.row_min),
      seat: item.seat_min == null ? "" : String(item.seat_min),
      precision: item.confidence === "exact" && item.row_min === item.row_max && item.seat_min === item.seat_max ? "exact" as const : "range" as const,
      availableAt: item.observed_at, source: "external" as const, sourceRef: `external_seat_observations:${item.id}`,
    })),
  ];
}

/** No physical edge is inferred from a maximum: multiple larger capacities remain hypotheses. */
function definitionsFor(analysis: EvidenceAnalysis, eventIds: string[]): EventLayoutDefinition[] {
  if (!analysis.accepted.length || analysis.accepted.some(item => !/^[A-G](?:[1-9]|1[0-7])$/.test(item.block)
    || !/^\d+$/.test(item.row) || Number(item.row) < 1 || Number(item.row) > 80)) return [];
  const rowFloor = Math.max(...analysis.accepted.map(item => Number(item.row)));
  const rows = [16, 20, 24, 32, 40, 60, 80].filter(value => value >= rowFloor).slice(0, 2);
  const capacities = [12, 16, 20, 24, 32, 48, 64, 96, 128, 200];
  const continuousFloor = Math.max(...analysis.accepted.map(item => Math.ceil(Number(item.seat) / Number(item.row))));
  const resetFloor = Math.max(...analysis.accepted.map(item => Number(item.seat)));
  const columns = [...new Set([...capacities.filter(value => value >= continuousFloor).slice(0, 2),
    ...capacities.filter(value => value >= resetFloor).slice(0, 1)])].sort((a, b) => a - b);
  return rows.flatMap(rowCount => columns.map(columnCount => ({
    id: `kyocera:${analysis.eventId}`, version: EVENT_PREDICTION_VERSION, eventIds: [...eventIds], rows: rowCount, columns: columnCount,
  })));
}

export function prepareEventPrediction({ reports, external = [], events, selectedEventId, cutoff = new Date().toISOString(),
  readState = "ready", limited = false, sharedLayout = false }: {
  reports: SeatReport[]; external?: ExternalSeatObservation[]; events: PredictionEvent[]; selectedEventId: string;
  cutoff?: string; readState?: "ready" | "unavailable"; limited?: boolean; sharedLayout?: boolean;
}): EventPredictionInput {
  const evidence = seatPredictionEvidence(reports, external).sort((a, b) => a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
  const allowed = events.filter(event => SEAT_MAP_PILOT_EVENT_IDS.includes(event.id));
  // A range, unknown timestamp or future observation is not an exact seat for choosing the prediction date.
  // Keep every original observation in the final analysis; do not let a held-only day hide another day's seats.
  const counts = new Map(allowed.map(event => [event.id, analyzeReports(evidence, event.id, cutoff).accepted.length]));
  const preferred = allowed.find(event => event.id === selectedEventId && (counts.get(event.id) ?? 0) > 0)
    ?? [...allowed].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.date.localeCompare(b.date))[0];
  const eventId = preferred?.id ?? selectedEventId;
  const eventIds = sharedLayout ? allowed.map(event => event.id).sort() : [eventId];
  const analysis = analyzeReports(evidence, eventId, cutoff, eventIds);
  const definitions = definitionsFor(analysis, eventIds);
  const state = readState !== "ready" ? "unavailable" : limited ? "limited" : !analysis.accepted.length ? "empty"
    : !preferred || !definitions.length ? "unsupported" : "ready";
  // Full canonical input is an internal cache key, never a public URL or image payload.
  const key = JSON.stringify([EVENT_PREDICTION_VERSION, eventIds, preferred?.date, state,
    analysis.accepted.map(item => [item.id, item.eventId, item.block, item.row, item.seat, item.source, item.availableAt]),
    analysis.held.map(item => [item.evidence.id, item.evidence.eventId, item.reason]), definitions]);
  return { key, eventId, eventIds, date: preferred?.date ?? "", analysis, definitions, state };
}
