import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { daysUntilEventInJst } from "../src/lib/external-seats/sourcePolicy.ts";
import {
  isCurrentXSeatPost, normalizeXSeatPostUrl, X_SEAT_POST_EVIDENCE, X_SEAT_POST_MAX_AGE_MS, X_SEAT_POST_PREFIX,
} from "../src/lib/external-seats/xSeatPosts.ts";

type ReviewedPost = {
  eventId: string;
  artist: string;
  date: string;
  venue: string;
  block: string;
  row: number | null;
  seat: number | null;
  sourceUrl: string;
  verifiedAt: string;
};
type PublicEvent = { id: string; title: string; date: string; venue: string };
const databaseUrl = "https://sibjmyabcwpojtzbnqnc.supabase.co";
const positiveNumber = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 1 && value <= 500;

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file || (flag && flag !== "--publish")) throw new Error("Usage: importXSeatPosts.mts <reviewed.json> [--publish]");
  const posts: ReviewedPost[] = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(posts) || !posts.length || posts.length > 100) throw new Error("Expected 1 to 100 reviewed posts");
  const response = await fetch("https://tixrepo.com/api/public/event-catalog", { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Public catalog HTTP ${response.status}`);
  const catalog = await response.json() as { events: PublicEvent[] };
  const now = new Date();
  const usedPosts = new Set<string>();
  const rows = posts.map(post => {
    const url = normalizeXSeatPostUrl(post.sourceUrl);
    const event = catalog.events.find(item => item.id === post.eventId);
    const days = daysUntilEventInJst(post.date, now);
    if (!url || usedPosts.has(url) || !isCurrentXSeatPost(post.verifiedAt, now.getTime())) {
      throw new Error("A post URL is missing, repeated or overdue for verification");
    }
    if (!event || event.date !== post.date || event.venue !== post.venue || days === null || days < 0 || days > 7
      || !post.artist?.trim() || !event.title.normalize("NFKC").toLowerCase().includes(post.artist.normalize("NFKC").toLowerCase())) {
      throw new Error("A post does not match the published artist, date and venue");
    }
    const block = post.block?.normalize("NFKC").trim().toUpperCase();
    if (!/^[A-Z][1-9]\d?$/.test(block)) throw new Error("An arena block is missing or invalid");
    if (![post.row, post.seat].every(value => value === null || positiveNumber(value))) throw new Error("Invalid row or seat");
    usedPosts.add(url);
    return {
      event_id: event.id,
      source_type: "other",
      source_key: createHash("sha256").update(`x-seat-post:${url}`).digest("hex"),
      source_url: url,
      ingestion_method: "crawler",
      observed_at: post.verifiedAt,
      seat_area: "arena",
      block,
      row_min: post.row,
      row_max: post.row,
      seat_min: post.seat,
      seat_max: post.seat,
      confidence: post.row !== null && post.seat !== null ? "exact" : "candidate",
      evidence_summary: X_SEAT_POST_EVIDENCE,
      review_status: "approved",
    };
  });
  if (flag === "--publish") {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key || process.env.NEXT_PUBLIC_SUPABASE_URL !== databaseUrl) throw new Error("Tixrepo service configuration is missing");
    const db = createClient(databaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const table = db.from("external_seat_observations");
    const { error } = await table.upsert(rows, { onConflict: "event_id,source_type,source_key", ignoreDuplicates: true });
    if (error) throw new Error(`Reviewed seats could not be stored (${error.code})`);
    for (const row of rows) {
      const stored = await db.from("external_seat_observations").select("source_url,block,row_min,seat_min,review_status,observed_at")
        .eq("event_id", row.event_id).eq("source_type", row.source_type).eq("source_key", row.source_key).single();
      if (stored.error || stored.data.review_status !== "approved" || stored.data.source_url !== row.source_url
        || stored.data.block !== row.block || stored.data.row_min !== row.row_min || stored.data.seat_min !== row.seat_min) {
        throw new Error("A stored post differs from the review or is no longer approved");
      }
      if (Date.parse(stored.data.observed_at) < Date.parse(row.observed_at)) {
        const refreshed = await db.from("external_seat_observations").update({ observed_at: row.observed_at })
          .eq("event_id", row.event_id).eq("source_type", row.source_type).eq("source_key", row.source_key)
          .eq("review_status", "approved").lt("observed_at", row.observed_at);
        if (refreshed.error) throw new Error(`Verification timestamp could not be refreshed (${refreshed.error.code})`);
      }
    }
    const expired = await db.from("external_seat_observations").delete().eq("source_type", "other")
      .eq("ingestion_method", "crawler").eq("evidence_summary", X_SEAT_POST_EVIDENCE)
      .like("source_url", `${X_SEAT_POST_PREFIX}%`).eq("review_status", "approved")
      .lt("observed_at", new Date(now.getTime() - X_SEAT_POST_MAX_AGE_MS).toISOString());
    if (expired.error) throw new Error(`Expired source cleanup failed (${expired.error.code})`);
  }
  console.log(JSON.stringify({ published: flag === "--publish", rows: rows.map(row => ({
    eventId: row.event_id, block: row.block, row: row.row_min, seat: row.seat_min, sourceUrl: row.source_url,
  })) }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "X seat import failed");
  process.exitCode = 1;
});
