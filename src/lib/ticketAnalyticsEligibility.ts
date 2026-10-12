import type { TicketResultAnalytics } from "./artistPageTypes";

// Read-only quarantine: user-described resale seats also have matching ticket-result IDs.
// Keep their seat positions; do not treat their default lottery attributes as personal wins.
export const UNVERIFIED_TICKET_IDS = new Set([
  "edf8265f-89c8-4d91-9740-e9a5fb9e0e65",
  "b9b2bb86-ea86-4c21-bd9b-16866f74ca51",
  "dac4d2ec-025c-4588-a92b-d4597f303d11",
]);
export function eligibleTicketReports<T extends Pick<TicketResultAnalytics, "id" | "result" | "lost_application_count">>(rows: T[]) {
  return rows.filter(row => !UNVERIFIED_TICKET_IDS.has(row.id) && (row.result === "won" || row.result === "lost") && Number.isSafeInteger(row.lost_application_count) && (row.lost_application_count ?? -1) >= 0 && (row.result !== "lost" || (row.lost_application_count ?? 0) > 0));
}
