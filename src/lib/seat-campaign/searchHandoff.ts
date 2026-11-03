import { parseSeatInput, samePerformance, type CampaignEvent, type SeatInput, type SeatKind } from "./model";

export const SEARCH_DRAFT_KEY = "tixrepo:seat-search-draft:v1";
export const SEARCH_DRAFT_TTL_MS = 15 * 60 * 1000;
export type SearchDraft = {
  version: 1; id: string; createdAt: number; venueId: string; eventId: string; date: string; session: string;
  seatType: SeatKind | null; row: string; number: string; contextLabel: string;
};
export function makeSearchDraft(event: CampaignEvent, venueId: string, row: string, number: string, contextLabel: string, id: string, now: number, seatType: SeatKind | null = "stand"): SearchDraft {
  const input = parseSeatInput({ eventId: event.id, date: event.date, session: event.session, seatType: seatType??"other", block: "要券面確認", row, number }, event);
  if (!venueId || !id || !Number.isFinite(now) || !contextLabel || contextLabel.length > 120) throw new Error("検索内容を引き継げません。");
  return { version: 1, id, createdAt: now, venueId, eventId: event.id, date: event.date, session: event.session, seatType, row: input.row, number: input.number, contextLabel };
}
export function readSearchDraft(raw: string | null, event: CampaignEvent, venueId: string, now: number): SearchDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as SearchDraft;
    if (draft.version !== 1 || draft.venueId !== venueId || !samePerformance(draft, event) || ![null,"stand","arena","other"].includes(draft.seatType) ||
      !Number.isFinite(draft.createdAt) || now < draft.createdAt || now - draft.createdAt > SEARCH_DRAFT_TTL_MS) return null;
    return makeSearchDraft(event, venueId, draft.row, draft.number, draft.contextLabel, draft.id, draft.createdAt,draft.seatType);
  } catch { return null; }
}
export function searchDraftPrefill(draft: SearchDraft): Pick<SeatInput, "block" | "row" | "number"> & {seatType: SeatKind | ""} {
  // Diagram area labels are not necessarily the ticket's block label. Never silently adopt them.
  return { seatType: draft.seatType??"", block: "", row: draft.row, number: draft.number };
}
