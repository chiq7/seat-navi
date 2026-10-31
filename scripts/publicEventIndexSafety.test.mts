import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as artists from "../src/lib/artists.ts";
import * as eventTitle from "../src/lib/eventTitle.ts";
import * as eventDisplay from "../src/lib/eventDisplay.ts";
import type { CrawledEvent } from "../src/lib/types.ts";

// Execute the production modules with local query responses. No credentials or DB calls.
function loadModule<T>(file: string, dependencies: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const local = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", code)((id: string) => {
    assert.ok(Object.hasOwn(dependencies, id), `unexpected dependency: ${id}`);
    return dependencies[id];
  }, local, local.exports);
  return local.exports as T;
}

const { isTestEvent } = loadModule<typeof import("../src/lib/seoData.ts")>("src/lib/seoData.ts", {
  react: { cache: (fn: unknown) => fn },
  "@/lib/artists": artists,
  "@/lib/events": {},
  "@/lib/eventTitle": eventTitle,
  "@/lib/og/eventOgData": {},
  "@/lib/og/reportOgData": {},
  "@/lib/supabase/client": {},
  "@/lib/eventDisplay": eventDisplay,
});
const { queryEventWithArtist } = loadModule<typeof import("../src/lib/og/eventOgData.ts")>("src/lib/og/eventOgData.ts", {
  "@/lib/supabase/client": {},
  "@/lib/artists": artists,
  "@/lib/eventTitle": eventTitle,
  "@/lib/artistPageHelpers": { fmtDate: (date: unknown) => date },
});

type QueryResult = { data: CrawledEvent | CrawledEvent[] | null; error: null | { message: string } };
function clientFor(result: QueryResult) {
  const query = {
    select() { return query; },
    eq() { return query; },
    async maybeSingle() { return result; },
    async limit() { return result; },
  };
  return { from(table: string) { assert.equal(table, "events"); return query; } };
}
function publicModule(result: QueryResult) {
  return loadModule<typeof import("../src/lib/serverEventData.ts")>("src/lib/serverEventData.ts", {
    "server-only": {},
    "next/cache": { unstable_cache: (fn: unknown) => fn },
    "@/lib/events": {},
    "@/lib/og/eventOgData": { queryEventWithArtist },
    "@/lib/seoData": { isTestEvent },
    "@/lib/supabase/public": { createSupabasePublicClient: () => clientFor(result) },
    "@/lib/eventDisplay": eventDisplay,
  });
}
const event: CrawledEvent = {
  id: "public-english-title", title: "Bullet Train", date: "2026-11-25",
  venue: "東京ドーム", venue_id: "tokyo-dome", artist_slug: "bullet-train", genre: "jpop",
};
const infoFor = (row: CrawledEvent) => ({ event: row, artist: artists.resolveArtist(row), tourName: row.title, isTestData: false, dateLabel: row.date ?? "" });

test("a successful empty event lookup remains a missing page", async () => {
  assert.equal(await publicModule({ data: null, error: null }).getCachedPublicEvent("missing"), null);
});
test("a read failure must not become a missing page", async () => {
  await assert.rejects(publicModule({ data: null, error: { message: "temporary network failure" } }).getCachedPublicEvent(event.id), /Public event lookup failed/);
});
test("an available public event preserves its identity and payload", async () => {
  const result = await publicModule({ data: event, error: null }).getCachedPublicEvent(event.id);
  assert.ok(result);
  assert.deepEqual(result.event, event);
  assert.equal(result.artist?.slug, "bullet-train");
});
test("artist-only rows stay unpublished", async () => {
  const hidden = { ...event, id: "artist-only", title: "超特急" };
  assert.equal(isTestEvent(hidden), true);
  assert.equal(await publicModule({ data: hidden, error: null }).getCachedPublicEvent(hidden.id), null);
});
test("canonical selection cannot prefer an unpublished artist-only row", async () => {
  const hidden = { ...event, id: "artist-only", title: "超特急" };
  assert.equal(eventDisplay.findDisplayedEventRepresentative([event, hidden], event)?.id, hidden.id);
  for (const data of [[event, hidden], [hidden, event]]) {
    assert.equal(await publicModule({ data, error: null }).getCachedCanonicalEventId(infoFor(event)), event.id);
  }
});
test("test-tagged rows are not canonical destinations", async () => {
  const hidden = { ...event, id: "test-tagged", title: "超特急 東京公演【テストデータ】" };
  assert.equal(await publicModule({ data: [event, hidden], error: null }).getCachedCanonicalEventId(infoFor(event)), event.id);
});
test("canonical lookup failure must not be cached as a successful choice", async () => {
  await assert.rejects(publicModule({ data: null, error: { message: "temporary network failure" } }).getCachedCanonicalEventId(infoFor(event)), /Canonical event lookup failed/);
});
test("valid distinct performances are not folded together", async () => {
  const day = { ...event, id: "day", title: "超特急 DAY BREAK 昼公演" };
  const night = { ...event, id: "night", title: "超特急 DAY BREAK 夜公演" };
  assert.equal(await publicModule({ data: [night, day], error: null }).getCachedCanonicalEventId(infoFor(day)), day.id);
  assert.equal(await publicModule({ data: [day, night], error: null }).getCachedCanonicalEventId(infoFor(night)), night.id);
});
