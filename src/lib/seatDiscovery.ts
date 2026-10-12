import type { SeatReport } from "./types";
import type { ExternalSeatObservation } from "./external-seats/types";
import { externalObservationsToArenaReports } from "./external-seats/arena";
import { eligibleTicketReports } from "./ticketAnalyticsEligibility";

export type SeatDiscoveryEvent = { id: string; date: string; title: string; venue: string; venue_id: string; artist_slug: string };
// Only an audited aggregate may enable a percentage; table location alone is not provenance.
export type DiscoveryLottery = { status: "pending"; reason?: "empty" | "unverified" | "unavailable" | "limited" } | {
  status: "verified" | "reported"; eventIds: string[]; scopeLabel: string; lotteryLabel: string;
  won: number; lost: number;
  normalArena?: { won: number; total: number };
  upgrade?: { won: number; total: number };
};
export type SeatDiscoveryData = {
  artistSlug: string;
  artistName: string;
  image: string;
  events: SeatDiscoveryEvent[];
  selectedEventId: string;
  reports: SeatReport[];
  externalObservations: ExternalSeatObservation[];
  status: "ready" | "unavailable";
  limited: boolean;
  lottery?: DiscoveryLottery;
};

export function discoveryLotterySummary(data: SeatDiscoveryData) {
  const value = data.lottery;
  if (!value || value.status === "pending" || data.status !== "ready") return null;
  const ids = new Set(data.events.map(event => event.id));
  if (!value.eventIds.length || value.eventIds.some(id => !ids.has(id)) || !value.scopeLabel.trim() || !value.lotteryLabel.trim()) return null;
  if (![value.won, value.lost].every(count => Number.isSafeInteger(count) && count >= 0)) return null;
  const total = value.won + value.lost;
  if (!Number.isSafeInteger(total) || total === 0) return null;
  const categoryRate = (category?: { won: number; total: number }) => category && Number.isSafeInteger(category.won) && Number.isSafeInteger(category.total) && category.total > 0 && category.won >= 0 && category.won <= category.total ? Math.round(category.won / category.total * 100) : null;
  return { ...value, total, percent: Math.round(value.won / total * 100), normalArenaPercent: categoryRate(value.normalArena), upgradePercent: categoryRate(value.upgrade) };
}

/** Validated stored declarations, not proof of official odds or complete import provenance. */
export function reportedDiscoveryLottery(events: SeatDiscoveryEvent[], rows: { id: string; event_id: string; result: "won" | "lost"; lost_application_count: number; seat_type?: string | null; upgrade_result?: string | null }[], totalCount: number | null, failed = false): DiscoveryLottery {
  if (failed || totalCount === null || !events.length) return { status: "pending", reason: "unavailable" };
  if (totalCount > rows.length) return { status: "pending", reason: "limited" };
  const ids = new Set(events.map(event => event.id));
  const scoped = rows.filter(row => ids.has(row.event_id));
  const eligible = eligibleTicketReports(scoped);
  if (!eligible.length) return { status: "pending", reason: rows.length ? "unverified" : "empty" };
  const won = eligible.filter(row => row.result === "won").length;
  const lost = eligible.reduce((sum, row) => sum + row.lost_application_count, 0);
  const normal = eligible.filter(row => row.result === "won" && row.seat_type != null && row.seat_type !== "unknown" && row.upgrade_result !== "applied_won");
  const upgrade = eligible.filter(row => row.upgrade_result === "applied_won" || row.upgrade_result === "applied_lost");
  return { status: "reported", eventIds: events.map(event => event.id), scopeLabel: `${events[0].venue} ${events.map(event => discoveryDateLabel(event.date)).join("・")}`, lotteryLabel: "抽選種別合算・報告内", won, lost, normalArena: { won: normal.filter(row => row.seat_type === "arena").length, total: normal.length }, upgrade: { won: upgrade.filter(row => row.upgrade_result === "applied_won").length, total: upgrade.length } };
}

/** Same position priority as EventDetailClient: selected date first, otherwise newest. */
export function selectDiscoverySeats(reports: SeatReport[], eventIds: string[], selectedEventId: string) {
  const allowed = new Set(eventIds);
  const positions = new Map<string, SeatReport>();
  const sorted = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const report of sorted) {
    if (!allowed.has(report.event_id) || !report.block.trim() || report.row_num < 1 || report.seat_num < 1) continue;
    const key = `${report.block}:${report.row_num}:${report.seat_num}`;
    const current = positions.get(key);
    if (!current || (current.event_id !== selectedEventId && report.event_id === selectedEventId)) positions.set(key, report);
  }
  return [...positions.values()];
}

export function summarizeDiscovery(data: SeatDiscoveryData) {
  const ids = data.events.map(event => event.id);
  const reports = data.reports.filter(report => ids.includes(report.event_id));
  const seats = selectDiscoverySeats(reports, ids, data.selectedEventId);
  const external = data.externalObservations.filter(item => ids.includes(item.event_id) && item.review_status === "approved" && item.seat_area === "arena");
  const externalCells = externalObservationsToArenaReports(external);
  return {
    seats,
    external,
    reportCount: reports.length,
    seatCount: seats.length,
    externalCount: external.length, // Source records, never expanded range cells.
    hasMap: seats.length > 0 || externalCells.length > 0,
    blocks: [...new Set([...seats.map(seat => seat.block), ...externalCells.map(cell => cell.block)])].sort(),
  };
}

export function seatDiscoveryLinks(artistSlug: string, eventId: string) {
  return {
    artist: `/artists/${encodeURIComponent(artistSlug)}`,
    lottery: `/artists/${encodeURIComponent(artistSlug)}#ticket-data`,
    map: `/events/${encodeURIComponent(eventId)}`,
    report: `/report/ticket?event=${encodeURIComponent(eventId)}`,
  };
}

export function discoveryDateLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" }).format(new Date(`${date}T00:00:00+09:00`));
}

export function isSeatDiscoveryPreview(environment: string | undefined, flag: string | string[] | undefined) {
  return environment === "development" && flag === "1";
}
