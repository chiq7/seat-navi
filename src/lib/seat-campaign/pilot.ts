import type { CampaignEvent, KnownBlock } from "./model";

// Event identity and show time are matched to the official schedule. Ticket display timing is not verified.
export const PILOT_EVENT: CampaignEvent = {
  id: "98e32afe6c25407585c2", venueId: "kyocera-dome", title: "Number_i LIVE TOUR No.III", venue: "京セラドーム大阪",
  date: "2026-12-02", session: "18:30開演",
  sourceUrl: "https://www.livenationhip.co.jp/en/all-events/number_i-tickets-ae1689539?locale=ja",
};
// No event-specific arena block inventory has been verified. Do not borrow another show's blocks.
export const PILOT_KNOWN_BLOCKS: KnownBlock[] = [];
