import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTISTS, assignArtistSlug } from "./artists";
import { classifyAgainstExisting, dedupeRowsWithReview, mapWithConcurrency, toEventRows, type EventRow } from "./eventCrawler";
import { robotsAllowsPath } from "./external-seats/sourcePolicy";
import { eventDateInJapan, excludedOfficialEvent, getOfficialEventText, OFFICIAL_EVENT_USER_AGENT, officialEventSources, parseOfficialEventSource, type OfficialEventSource } from "./officialVenueEvents";
import { EVENT_AI_MAX_CALLS, EVENT_AI_MODEL, eventAiCostUsd, selectOfficialMusicEvents, type EventInference, type OfficialEventRecord } from "./workersAiEvents";

type SourceReport = {
  source: OfficialEventSource;
  status: "ok" | "unpublished" | "failed";
  candidates: number;
  inferenceAttempted: boolean;
  selected: OfficialEventRecord[];
  inputTokens: number;
  outputTokens: number;
  error?: string;
};

async function collectSource(
  source: OfficialEventSource,
  today: string,
  lastDay: string,
  readRobots: (origin: string) => Promise<string | null>,
  infer: EventInference,
): Promise<SourceReport> {
  const empty = { source, candidates: 0, inferenceAttempted: false, selected: [], inputTokens: 0, outputTokens: 0 };
  let candidates: OfficialEventRecord[] = [];
  try {
    const robots = await readRobots(new URL(source.url).origin);
    if (robots == null || !robotsAllowsPath(robots, source.url, OFFICIAL_EVENT_USER_AGENT)) throw new Error("Official schedule is unavailable for automated crawling");
    const html = await getOfficialEventText(source.url, "schedule");
    if (html === null && source.month > today.slice(0, 7)) return { ...empty, status: "unpublished" };
    if (html === null) throw new Error("Official schedule HTTP 404");
    candidates = parseOfficialEventSource(html, source)
      .filter(row => row.date >= today && row.date <= lastDay && !excludedOfficialEvent(row));
    const classification = await selectOfficialMusicEvents(candidates, infer);
    return {
      source, status: "ok", candidates: candidates.length, inferenceAttempted: candidates.length > 0, selected: classification.selected,
      inputTokens: classification.usage.inputTokens, outputTokens: classification.usage.outputTokens,
    };
  } catch (error) {
    return { ...empty, status: "failed", candidates: candidates.length, inferenceAttempted: candidates.length > 0,
      error: (error instanceof Error ? error.message : String(error)).slice(0, 240) };
  }
}

export function buildOfficialEventRow(
  source: OfficialEventSource,
  record: OfficialEventRecord,
  now: Date,
): EventRow | undefined {
  const fromTitle = assignArtistSlug({ title: record.title, artist_slug: null });
  const fromPerformer = record.performer && fromTitle.match.status === "none"
    ? assignArtistSlug({ title: record.performer, artist_slug: null }) : null;
  const artistSlug = fromTitle.event.artist_slug ?? fromPerformer?.event.artist_slug ?? null;
  const genre = ARTISTS.find(artist => artist.slug === artistSlug)?.genre ?? "other";
  const [row] = toEventRows([{ title: record.title, date: record.date, genre }], source.venue, null, null, now, record.sourceUrl).rows;
  return row ? { ...row, artist_slug: artistSlug } : undefined;
}

type InsertedEvent = EventRow & { sourceUrl: string };

export async function collectOfficialEvents(client: SupabaseClient, infer: EventInference, now: Date) {
  const today = eventDateInJapan(now);
  const lastDay = eventDateInJapan(new Date(now.getTime() + 95 * 86_400_000));
  const sources = officialEventSources(now);
  if (sources.length > EVENT_AI_MAX_CALLS) throw new Error("The event crawler exceeded its inference limit");
  const robots = new Map<string, Promise<string | null>>();
  function readRobots(origin: string) {
    let result = robots.get(origin);
    if (!result) {
      result = getOfficialEventText(origin + "/robots.txt", "robots");
      robots.set(origin, result);
    }
    return result;
  }
  const reports = await mapWithConcurrency(sources, 3, source => collectSource(source, today, lastDay, readRobots, infer));

  const byVenue = new Map<string, EventRow[]>();
  const origins = new Map<string, string>();
  const equivalentTitles = new Map<string, string[]>();
  for (const report of reports) {
    for (const selection of report.selected) {
      const row = buildOfficialEventRow(report.source, selection, now);
      if (!row) continue;
      const group = byVenue.get(row.venue_id);
      if (group) group.push(row);
      else byVenue.set(row.venue_id, [row]);
      origins.set(row.id, selection.sourceUrl);
      // Older catalog rows may have combined the venue's separate performer and title fields.
      if (selection.performer && selection.performer.length <= 80) {
        equivalentTitles.set(row.id, [selection.performer + " " + row.title, row.title + " " + selection.performer]);
      }
    }
  }

  const inserted: InsertedEvent[] = [];
  const databaseFailures: string[] = [];
  let existing = 0;
  let ambiguous = 0;
  for (const [venueId, items] of byVenue) {
    const deduped = dedupeRowsWithReview(items);
    const result = await classifyAgainstExisting(deduped.rows, venueId, client, equivalentTitles);
    if (result.error) {
      databaseFailures.push(venueId + " existing-event lookup failed");
      continue;
    }
    existing += result.matchedExisting.length;
    ambiguous += deduped.skippedSameSlotCandidates.length + result.skippedAmbiguous.length;
    if (result.newRows.length === 0) continue;
    const { data, error } = await client.from("events")
      .upsert(result.newRows, { onConflict: "id", ignoreDuplicates: true }).select("id");
    if (error || !data) {
      databaseFailures.push(venueId + " event insert failed");
      continue;
    }
    const ids = new Set(data.map(row => row.id));
    for (const row of result.newRows) {
      const sourceUrl = origins.get(row.id);
      if (ids.has(row.id) && sourceUrl) inserted.push({ ...row, sourceUrl });
    }
  }

  const usage = reports.reduce((sum, report) => ({
    inputTokens: sum.inputTokens + report.inputTokens,
    outputTokens: sum.outputTokens + report.outputTokens,
  }), { inputTokens: 0, outputTokens: 0 });
  return {
    model: EVENT_AI_MODEL, day: today, inserted, existing, ambiguous, usage, nominalAiUsd: eventAiCostUsd(usage),
    usageComplete: !reports.some(report => report.inferenceAttempted && report.status === "failed"),
    databaseFailures,
    sources: reports.map(({ selected, ...report }) => ({ ...report, selected: selected.length })),
  };
}
