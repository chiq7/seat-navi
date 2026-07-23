import { createClient } from "@supabase/supabase-js";
import { assignArtistSlug } from "@/lib/artists";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

const WRITE_CONFIRMATION = "EVENT_ARTIST_BACKFILL_ALLOW_PRODUCTION_WRITE";

function parseArgs(argv: string[]): { execute: boolean; limit: number } {
  let execute = false;
  let limit = 10_000;
  for (const arg of argv) {
    if (arg === "--execute") execute = true;
    else if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
        throw new Error("--limit must be an integer between 1 and 10000");
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { execute, limit };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  if (args.execute && process.env[WRITE_CONFIRMATION] !== "true") {
    throw new Error(`--execute requires ${WRITE_CONFIRMATION}=true`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL and service role key are required");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("events")
    .select("id, title, artist_slug")
    .is("artist_slug", null)
    .order("id", { ascending: true })
    .limit(args.limit);
  if (error) throw new Error(`events SELECT failed: ${error.code ?? "unknown"} ${error.message}`);

  const rows = (data ?? []) as Array<{ id: string; title: string; artist_slug: null }>;
  const matched: Array<{ id: string; title: string; slug: string; reason: string }> = [];
  let ambiguous = 0;
  let unmatched = 0;

  for (const row of rows) {
    const result = assignArtistSlug(row);
    const candidates = result.match.candidateSlugs.join(",") || "-";
    console.log(`[${result.match.status}] ${row.title} | candidates=${candidates} | ${result.match.reason}`);
    if (result.match.status === "matched" && result.event.artist_slug) {
      matched.push({ id: row.id, title: row.title, slug: result.event.artist_slug, reason: result.match.reason });
    } else if (result.match.status === "ambiguous") ambiguous++;
    else unmatched++;
  }

  let updated = 0;
  if (args.execute) {
    for (const row of matched) {
      const { data: updatedRows, error: updateError } = await supabase
        .from("events")
        .update({ artist_slug: row.slug })
        .eq("id", row.id)
        .is("artist_slug", null)
        .select("id");
      if (updateError) throw new Error(`event update failed: ${updateError.code ?? "unknown"} ${updateError.message}`);
      updated += updatedRows?.length ?? 0;
    }
  }

  console.log(
    `mode=${args.execute ? "execute" : "dry-run"} scanned=${rows.length} matched=${matched.length} ambiguous=${ambiguous} unmatched=${unmatched} updated=${updated}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown backfill error");
  process.exitCode = 1;
});
