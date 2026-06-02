import type { SeatReport } from "@/lib/types";

const NIZIU_KYOCERA_EVENT_IDS = new Set([
  "b0b646dd6f293e73f6a9",
  "82cdeaadb4683d7b388a",
]);

const SEAT_REFERENCE_LIMIT = 10;
const TICKET_REFERENCE_LIMIT = 10;

const BLOCK_COUNTS: [string, number][] = [
  ["A1", 1],
  ["A2", 2],
  ["A3", 3],
  ["A4", 3],
  ["A5", 2],
  ["A7", 2],
  ["A8", 3],
  ["A9", 3],
  ["A10", 2],
  ["A11", 1],
  ["B1", 1],
  ["B2", 1],
  ["B3", 2],
  ["B4", 1],
  ["B8", 1],
  ["B9", 2],
  ["B10", 1],
  ["B11", 1],
  ["C3", 1],
  ["C9", 1],
  ["D4", 1],
  ["D5", 1],
  ["D6", 1],
  ["D7", 1],
  ["E5", 1],
  ["E7", 1],
];

function makeSeatReferenceReports(eventId: string): SeatReport[] {
  let index = 0;
  return BLOCK_COUNTS.flatMap(([block, count]) =>
    Array.from({ length: count }, (_, offset) => {
      index += 1;
      return {
        id: `initial-reference-${eventId}-${index}`,
        event_id: eventId,
        block,
        row_num: offset + 1,
        seat_num: 8 + offset,
        lottery_type: "fc1",
        lottery_round: null,
        lottery_name: null,
        payment_method: null,
        fc_history: null,
        comment: null,
        created_at: "2026-01-01T00:00:00.000Z",
      };
    }),
  );
}

export function getInitialSeatReferenceReports(eventId: string, realReportCount: number): SeatReport[] {
  if (!NIZIU_KYOCERA_EVENT_IDS.has(eventId) || realReportCount >= SEAT_REFERENCE_LIMIT) return [];
  return makeSeatReferenceReports(eventId);
}

export function getInitialTicketReferenceRate(eventId: string, realTotal: number) {
  if (!NIZIU_KYOCERA_EVENT_IDS.has(eventId) || realTotal >= TICKET_REFERENCE_LIMIT) return null;
  return {
    wonRate: 64,
    lostRate: 36,
  };
}
