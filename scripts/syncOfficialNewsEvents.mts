import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnvLocal.mjs";
import {
  planOfficialNewsEvents,
  summarizeDecisions,
  toEventUpsertRows,
  type ExistingEvent,
  type OfficialNewsEventCandidate,
} from "./officialNews/eventSync";

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
if ([...args].some((arg) => !["--execute", "--dry-run"].includes(arg)) || (execute && args.has("--dry-run"))) {
  throw new Error("Usage: syncOfficialNewsEvents.mts [--dry-run | --execute]");
}

loadEnvLocal();
if (execute && process.env.OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE !== "true") {
  throw new Error("--execute requires OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true before database access.");
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured.");

const supabase = createClient(supabaseUrl, serviceKey);
const { data: newsData, error: newsError } = await supabase
  .from("official_news")
  .select("id,artist_slug,article_title,category,is_event_candidate,event_name,tour_name,event_dates,venue_names,confidence,needs_review")
  .eq("is_event_candidate", true);
if (newsError) throw new Error(`official_news SELECT failed: ${newsError.message}`);

const { data: eventData, error: eventError } = await supabase
  .from("events")
  .select("id,title,venue,venue_id,date,genre,artist_slug");
if (eventError) throw new Error(`events SELECT failed: ${eventError.message}`);

const plan = planOfficialNewsEvents(
  (newsData ?? []) as OfficialNewsEventCandidate[],
  (eventData ?? []) as ExistingEvent[],
);

let saved = 0;
if (execute && plan.newRows.length > 0) {
  const { error } = await supabase.from("events").upsert(toEventUpsertRows(plan.newRows), { onConflict: "id" });
  if (error) throw new Error(`events UPSERT failed: ${error.message}`);
  saved = plan.newRows.length;
}

const report = {
  generated_at: new Date().toISOString(),
  mode: execute ? "execute" : "dry-run",
  candidate_articles: newsData?.length ?? 0,
  planned_events: plan.newRows.length,
  already_existing_pairs: plan.existingRows.length,
  saved_events: saved,
  decisions_summary: summarizeDecisions(plan.decisions),
  decisions: plan.decisions,
  planned_rows: plan.newRows,
};
const reportDir = path.resolve("official-news-reports");
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, `event-sync-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Mode: ${execute ? "EXECUTE" : "DRY-RUN"}`);
console.log(`Candidates: ${report.candidate_articles}`);
console.log(`Planned events: ${report.planned_events}`);
console.log(`Already existing pairs: ${report.already_existing_pairs}`);
console.log(`Saved events: ${report.saved_events}`);
console.log(`Report: ${reportPath}`);
console.log(JSON.stringify(report.decisions_summary, null, 2));
