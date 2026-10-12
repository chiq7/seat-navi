import type { SeatReport } from "@/lib/types";
import type { TicketSubmission } from "@/lib/ticketSubmission";

export const SEAT_MAP_PILOT_EVENT_IDS = ["93dec1e9b401d54ac03e", "42f4c61d6af9abb78c60"];
export const isInteractiveSeatMapPilot = (eventId: string) => SEAT_MAP_PILOT_EVENT_IDS.includes(eventId);
export function parseSeatReportId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
/** Only confirmed arena saves enable the return link; never use the public image payload. */
export function completedSeatReportId(pending: TicketSubmission | null): string | null {
  if (!pending?.ticketSaved || !pending.seatSaved || !pending.seat || pending.seat.event_id !== pending.ticket.event_id || pending.seat.id !== pending.ticket.id) return null;
  return parseSeatReportId(pending.seat.id);
}
export function seatMapReturnHref(eventId: string, reportId: unknown): string | null {
  const id = parseSeatReportId(reportId);
  return isInteractiveSeatMapPilot(eventId) && id ? `/events/${encodeURIComponent(eventId)}?seat_report=${encodeURIComponent(id)}#seat-map` : null;
}
export function focusedSeatPosition(reports: SeatReport[], eventId: string, reportId: unknown) {
  const id = parseSeatReportId(reportId);
  const report = id ? reports.find(item => item.id === id && item.event_id === eventId) : null;
  return report && report.block.trim() && [report.row_num, report.seat_num].every(value => Number.isSafeInteger(value) && value > 0)
    ? { block: report.block, row: report.row_num, seat: report.seat_num } : undefined;
}
