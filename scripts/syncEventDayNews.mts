/** Read-only NEWS-to-event editorial candidates. No AI calls, DB writes, or public data writes. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnvLocal.mjs";
import { planEventDayNews, type EventDayNewsArticle, type EventDayNewsCandidate, type EventDayNewsEvidence, type EventDayNewsEvent } from "../src/lib/eventDayNews";

export const EVENT_DAY_NEWS_USAGE = "syncEventDayNews.mts (--read-live | --input file.json) [--artist slug] [--event id] [--limit 100] [--output file.json] [--redact-quotes]";
type Args = { readLive: boolean; input?: string; artist?: string; event?: string; limit: number; output?: string; redactQuotes: boolean };

export function parseEventDayNewsArgs(argv: string[]): Args {
  const args: Args = { readLive: false, limit: 100, redactQuotes: false };
  const used = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (used.has(flag)) throw new Error(`Duplicate option: ${flag}`);
    used.add(flag);
    if (flag === "--read-live") { args.readLive = true; continue; }
    if (flag === "--redact-quotes") { args.redactQuotes = true; continue; }
    if (!["--input", "--artist", "--event", "--limit", "--output"].includes(flag)) throw new Error(EVENT_DAY_NEWS_USAGE);
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`Value required: ${flag}`);
    if (flag === "--limit") {
      const limit = Number(value);
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("--limit must be 1–500.");
      args.limit = limit;
    } else if (flag === "--input") args.input = value;
    else if (flag === "--artist") args.artist = value;
    else if (flag === "--event") args.event = value;
    else args.output = value;
  }
  if (args.readLive === Boolean(args.input)) throw new Error("Choose exactly one of --read-live or --input. No write/execute mode exists.");
  return args;
}

type RedactedEvidence = Omit<EventDayNewsEvidence, "quote" | "context"> & {
  context?: Omit<NonNullable<EventDayNewsEvidence["context"]>, "quote">;
};
type RedactedCandidate = Omit<EventDayNewsCandidate, "evidence"> & { evidence: RedactedEvidence[] };

/** Public artifacts retain provenance metadata, never the private source snippets. */
export function redactEventDayNewsQuotes(candidates: readonly EventDayNewsCandidate[]): RedactedCandidate[] {
  return candidates.map(candidate => {
    const copy = structuredClone(candidate);
    return { ...copy, evidence: copy.evidence.map(item => ({
      id: item.id, field: item.field, sourceNewsId: item.sourceNewsId, sourceUrl: item.sourceUrl,
      sourceStart: item.sourceStart, sourceEnd: item.sourceEnd, dateScope: item.dateScope,
      scope: item.scope, status: item.status,
      ...(item.context ? { context: { sourceStart: item.context.sourceStart, sourceEnd: item.context.sourceEnd } } : {}),
    })) };
  });
}

/** Privileged service client stays in the CLI, not the browser or public component dependency graph. */
export async function readEventDayNewsInputs(client: SupabaseClient, args: Args) {
  let newsQuery = client.from("official_news")
    .select("id,artist_slug,article_title,article_url,article_body,published_date,fetched_at,category,event_name,tour_name,event_dates,venue_names,confidence,needs_review")
    .in("category", ["goods", "fanclub", "live", "ticket", "release", "other"])
    .order("published_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true }).limit(args.limit + 1);
  if (args.artist) newsQuery = newsQuery.eq("artist_slug", args.artist);
  const { data: rawNews, error: newsError } = await newsQuery;
  if (newsError) throw new Error(`official_news SELECT failed (${newsError.code ?? "unknown"}).`);
  const news = (rawNews ?? []).slice(0, args.limit) as EventDayNewsArticle[];
  const events: EventDayNewsEvent[] = [];
  // The API default cap is not treated as a complete event catalogue.
  for (let offset = 0; offset < 10000; offset += 1000) {
    let eventQuery = client.from("events").select("id,artist_slug,title,venue,venue_id,date")
      .order("id", { ascending: true }).range(offset, offset + 999);
    if (args.artist) eventQuery = eventQuery.eq("artist_slug", args.artist);
    if (args.event) eventQuery = eventQuery.eq("id", args.event);
    const { data, error } = await eventQuery;
    if (error) throw new Error(`events SELECT failed (${error.code ?? "unknown"}).`);
    events.push(...((data ?? []) as EventDayNewsEvent[]));
    if ((data ?? []).length < 1000) return { news, events, newsLimitReached: (rawNews ?? []).length > args.limit };
  }
  throw new Error("Event pagination cap reached; input is incomplete. Narrow --artist or --event.");
}

export async function runEventDayNewsSync(argv: string[]): Promise<void> {
  const args = parseEventDayNewsArgs(argv);
  let input: { news: EventDayNewsArticle[]; events: EventDayNewsEvent[]; newsLimitReached: boolean };
  if (args.readLive) {
    loadEnvLocal();
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Read-only NEWS connection is not configured.");
    const { createClient } = await import("@supabase/supabase-js");
    input = await readEventDayNewsInputs(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }), args);
  } else {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(args.input!), "utf8")) as { news: EventDayNewsArticle[]; events: EventDayNewsEvent[] };
    if (!Array.isArray(parsed.news) || !Array.isArray(parsed.events)) throw new Error("Input needs news[] and events[].");
    const relevantNews = parsed.news.filter(article => !args.artist || article.artist_slug === args.artist);
    input = { news: relevantNews.slice(0, args.limit),
      events: parsed.events.filter(event => (!args.artist || event.artist_slug === args.artist) && (!args.event || event.id === args.event)),
      newsLimitReached: relevantNews.length > args.limit };
  }
  const candidates = planEventDayNews(input.news, input.events);
  const counts = { candidate: 0, "needs-review": 0, verified: 0, published: 0 };
  for (const candidate of candidates) counts[candidate.status]++;
  const generatedAt = new Date().toISOString();
  const report = { generatedAt, mode: args.readLive ? "read-live" : "offline", databaseWrites: 0,
    apiClassificationCalls: 0, publicWrites: 0, inputNews: input.news.length, inputEvents: input.events.length,
    newsLimitReached: input.newsLimitReached, matched: candidates.filter(candidate => candidate.eventId).length,
    counts, quotesRedacted: args.redactQuotes,
    candidates: args.redactQuotes ? redactEventDayNewsQuotes(candidates) : candidates };
  const reportPath = path.resolve(args.output ?? path.join("official-news-reports", "event-day-news", `${generatedAt.replace(/[:.]/g, "-")}.json`));
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ mode: report.mode, inputNews: report.inputNews, inputEvents: report.inputEvents,
    newsLimitReached: report.newsLimitReached, matched: report.matched, counts, quotesRedacted: report.quotesRedacted,
    databaseWrites: 0, publicWrites: 0, reportPath }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runEventDayNewsSync(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : "NEWS candidate reading failed.");
    process.exitCode = 1;
  });
}
