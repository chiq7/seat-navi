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
  newSeats: number;
  newArenaSeats: number;
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
    row.row_min != null && row.row_min >= 1 &&
    row.row_max != null &&
    row.seat_min != null && row.seat_min >= 1 &&
    row.seat_max != null &&
    (params.ingestionMethod !== "crawler" || row.seat_area !== "arena" ||
      (row.block && (row.row_max - row.row_min + 1) * (row.seat_max - row.seat_min + 1) <= 500)),
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

  let newSeats = 0;
  let newArenaSeats = 0;
  if (!params.dryRun && rows.length > 0) {
    const table = params.supabase.from("external_seat_observations");
    const onConflict = "event_id,source_type,source_key";
    if (params.ingestionMethod === "crawler") {
      // Repeated fetches must preserve the first observation and any review decision.
      const { data, error } = await table.upsert(rows, { onConflict, ignoreDuplicates: true }).select("seat_area");
      if (error) throw new Error(`外部席情報の保存に失敗しました: ${error.message}`);
      newSeats = data.length;
      newArenaSeats = data.filter(row => row.seat_area === "arena").length;
    } else {
      const { error } = await table.upsert(rows, { onConflict });
      if (error) throw new Error(`外部席情報の保存に失敗しました: ${error.message}`);
    }
  }

  return {
    parsed: parsed.length,
    accepted: rows.length,
    newSeats,
    newArenaSeats,
    skippedInvalid: parsed.length - rows.length,
    rows,
  };
}
