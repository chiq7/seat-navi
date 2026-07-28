export type ExternalSeatSourceType =
  | "pia_resale"
  | "ticketjam"
  | "ticket_ryutsu"
  | "official_resale"
  | "other";

export type ExternalSeatArea = "arena" | "stand" | "unknown";
export type ExternalSeatConfidence = "exact" | "range" | "candidate";
export type ExternalSeatReviewStatus = "approved" | "pending" | "rejected";

/** 外部ページから抽出した「座席に関する事実」。本文・出品者情報・価格は保持しない。 */
export type ExternalSeatObservationDraft = {
  seat_area: ExternalSeatArea;
  block: string | null;
  row_min: number | null;
  row_max: number | null;
  seat_min: number | null;
  seat_max: number | null;
  gate: string | null;
  level: string | null;
  confidence: ExternalSeatConfidence;
  evidence_summary: string;
};

export type ExternalSeatObservation = ExternalSeatObservationDraft & {
  id: string;
  event_id: string;
  source_type: ExternalSeatSourceType;
  source_url: string | null;
  observed_at: string;
  review_status: ExternalSeatReviewStatus;
};

export type ExternalSeatSource = {
  id: string;
  event_id: string;
  source_type: ExternalSeatSourceType;
  source_url: string;
  active: boolean;
  last_fetched_at: string | null;
};

