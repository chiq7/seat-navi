import { createClient } from "@supabase/supabase-js";
import { syncOfficialTourSources } from "@/lib/officialTourSources";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
if ([...args].some((arg) => !["--execute", "--dry-run"].includes(arg)) || (execute && args.has("--dry-run"))) {
  throw new Error("Usage: syncOfficialTourSources.mts [--dry-run | --execute]");
}

loadEnvLocal();
if (execute && process.env.OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE !== "true") {
  throw new Error("--execute requires OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true before database access.");
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured.");

const supabase = createClient(supabaseUrl, serviceKey);
const reports = await syncOfficialTourSources(supabase, !execute);
console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", reports }, null, 2));

if (reports.some((report) => report.error)) process.exitCode = 1;
