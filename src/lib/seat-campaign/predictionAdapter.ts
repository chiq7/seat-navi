import type { ArenaMapReport } from "../arena-map/arenaMapTypes";
import type { CampaignSummary } from "./model";

// Only caller-verified block IDs may enter an existing prediction layout. No range expansion,
// inferred stand/arena conversion, interpolation, acquisition metadata or new block geometry.
export function campaignPredictionReports(summary: CampaignSummary, targetEventId: string, verifiedBlocks: ReadonlySet<string>): ArenaMapReport[] {
  if (summary.event.id !== targetEventId) return [];
  return summary.rows.flatMap(r => r.seatType === "arena" && verifiedBlocks.has(r.block) && /^\d+$/.test(r.row)
    ? (r.acceptedNumbers ?? []).filter(n => /^\d+$/.test(n)).map(n => ({ block:r.block, row_num:Number(r.row), seat_num:Number(n), lottery_type:null, fc_history:null, payment_method:null, sourceKind:"seat_only" as const })) : []);
}
