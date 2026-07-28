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
  skippedNonArena: number;
  rows: Array<Record<string, unknown>>;
};

function sourceKey(eventId: string, sourceType: ExternalSeatSourceType, row: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify([eventId, sourceType, row.block, row.row_min, row.row_max, row.seat_min, row.seat_max]))
    .digest("hex");
}

/** アリーナと判定できる派生座席情報だけを保存する。価格・出品者・本文は保存しない。 */
export async function ingestExternalSeatText(params: IngestParams): Promise<IngestResult> {
  const parsed = parseExternalSeatText(params.text);
  const accepted = parsed.filter(
    (row) =>
      row.seat_area === "arena" &&
      row.block &&
      row.row_min != null &&
      row.row_max != null &&
      row.seat_min != null &&
      row.seat_max != null &&
      row.confidence !== "candidate",
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
    skippedNonArena: parsed.length - rows.length,
    rows,
  };
}

