import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseExternalSeatText } from "./parser";
import type { ExternalSeatSourceType } from "./types";

type IngestParams = {
  supabase: SupabaseClient;
  eventId: string;
  sourceType: ExternalSeatSourceType;
  sourceUrl?: string | null;
  text: string;
  ingestionMethod: "manual" | "crawler";
  dryRun?: boolean;
};

export type IngestResult = {
  parsed: number;
  accepted: number;
  skippedInvalid: number;
  rows: Array<Record<string, unknown>>;
};

function sourceKey(eventId: string, sourceType: ExternalSeatSourceType, row: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify([eventId, sourceType, row.seat_area, row.block, row.level, row.gate, row.row_min, row.row_max, row.seat_min, row.seat_max]))
    .digest("hex");
}

/** 派生座席情報だけを保存する。アリーナ以外は保存してもマップ・集計には使わない。 */
export async function ingestExternalSeatText(params: IngestParams): Promise<IngestResult> {
  const parsed = parseExternalSeatText(params.text);
  const accepted = parsed.filter((row) =>
    row.seat_area !== "unknown" &&
    row.row_min != null &&
    row.row_max != null &&
    row.seat_min != null &&
    row.seat_max != null,
  );
  const observedAt = new Date().toISOString();
  const rows = accepted.map((row) => {
    const base = {
      event_id: params.eventId,
      source_type: params.sourceType,
      source_url: params.sourceUrl ?? null,
      ingestion_method: params.ingestionMethod,
      observed_at: observedAt,
      review_status: "approved",
      ...row,
    };
    return { ...base, source_key: sourceKey(params.eventId, params.sourceType, base) };
  });

  if (!params.dryRun && rows.length > 0) {
    const { error } = await params.supabase
      .from("external_seat_observations")
      .upsert(rows, { onConflict: "event_id,source_type,source_key" });
    if (error) throw new Error(`外部席情報の保存に失敗しました: ${error.message}`);
  }

  return {
    parsed: parsed.length,
    accepted: rows.length,
    skippedInvalid: parsed.length - rows.length,
    rows,
  };
}
