import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import type { SupabaseClient } from "@supabase/supabase-js";
import { queryPublicAfterReports, queryPublicSetlists, selectInitialSetlist } from "../src/lib/publicArtistContent.ts";
import type { CrawledEvent } from "../src/lib/types.ts";
import type { EditableItem } from "../src/lib/setlistHelpers.ts";
import * as artists from "../src/lib/artists.ts";
import * as eventTitle from "../src/lib/eventTitle.ts";
import * as eventDisplay from "../src/lib/eventDisplay.ts";
import * as artistPageData from "../src/lib/artistPageData.ts";

const event = (id: string, date: string): CrawledEvent => ({ id, date, title: "Number_i LIVE TOUR", venue: "東京ドーム", artist_slug: "number-i", genre: "jpop" });
const events = [event("old", "2026-09-01"), event("recent", "2026-10-01"), event("next", "2026-12-01")];
const items: EditableItem[] = [{ id: "song", type: "song", title: "検証用の曲" }];
const records = [{ event_id: "old", items }, { event_id: "recent", items }, { event_id: "other-artist", items }];

type Result = { data?: unknown; count?: number | null; error: null | { message: string } };
function clientFor(responses: Record<string, Result>) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const client = { from(table: string) {
    assert.ok(responses[table], `unexpected table ${table}`);
    const query: Record<string, unknown> = { then(resolve: (value: Result) => unknown) { return Promise.resolve(resolve(responses[table])); } };
    for (const method of ["select", "in", "eq", "is", "or", "order", "limit"]) {
      query[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return query; };
    }
    return query;
  } };
  return { client: client as unknown as SupabaseClient, calls };
}

test("reading starts with the newest recorded completed performance", () => {
  assert.deepEqual(selectInitialSetlist(events, records, "2026-10-31"), { eventId: "recent", items });
});
test("explicit submission links retain an empty upcoming performance", () => {
  assert.deepEqual(selectInitialSetlist(events, records, "2026-10-31", "next"), { eventId: "next", items: [] });
});
test("foreign performance links and records cannot be adopted", () => {
  assert.equal(selectInitialSetlist(events, records, "2026-10-31", "other-artist").eventId, "recent");
});
test("empty records use upcoming or most recent past without fabricating songs", () => {
  assert.deepEqual(selectInitialSetlist(events, [], "2026-10-31"), { eventId: "next", items: [] });
  assert.deepEqual(selectInitialSetlist(events.slice(0, 2), [], "2026-10-31"), { eventId: "recent", items: [] });
  assert.deepEqual(selectInitialSetlist([], records, "2026-10-31"), { eventId: null, items: [] });
});
test("query failure is not an empty setlist", async () => {
  const { client } = clientFor({ setlists: { data: null, error: { message: "offline" } } });
  await assert.rejects(queryPublicSetlists(client, events), /could not be loaded/);
});
test("malformed stored setlists do not become editable empty replacements", async () => {
  const { client } = clientFor({ setlists: { data: [{ event_id: "recent", items: null }], error: null } });
  await assert.rejects(queryPublicSetlists(client, events), /items are unavailable/);
});
test("successful setlists preserve stored content and constrain event scope", async () => {
  const { client, calls } = clientFor({ setlists: { data: records, error: null } });
  assert.deepEqual(await queryPublicSetlists(client, events), records.slice(0, 2));
  assert.deepEqual(calls.find(call => call.method === "in")?.args, ["event_id", ["old", "recent", "next"]]);
});
test("report read failure is not a zero-report page", async () => {
  const { client } = clientFor({ after_reports: { data: null, error: { message: "offline" } } });
  await assert.rejects(queryPublicAfterReports(client, events), /could not be loaded/);
});
test("SSR authors retain the explicit public opt-in boundary", async () => {
  const reports = [{ id: "r", event_id: "recent", user_id: "public-user", memo: "本文" }, { id: "bad", event_id: "other", user_id: "hidden" }];
  const authors = [{ id: "public-user", display_name: "公開名", x_handle: "visible", show_x_on_posts: true }, { id: "hidden", display_name: "非公開名", show_x_on_posts: false }];
  const { client, calls } = clientFor({ after_reports: { data: reports, error: null }, profiles: { data: authors, error: null } });
  const result = await queryPublicAfterReports(client, events);
  assert.deepEqual(result.reports, reports.slice(0, 1));
  assert.deepEqual(result.authors, authors.slice(0, 1));
  assert.ok(calls.some(call => call.table === "profiles" && call.method === "eq" && call.args[0] === "show_x_on_posts" && call.args[1] === true));
  assert.ok(calls.every(call => call.method !== "select" || !String(call.args[0]).includes("email")));
});
test("optional author lookup failure keeps reports and reveals no author", async () => {
  const { client } = clientFor({ after_reports: { data: [{ id: "r", event_id: "recent", user_id: "u" }], error: null }, profiles: { data: null, error: { message: "offline" } } });
  const result = await queryPublicAfterReports(client, events);
  assert.equal(result.reports.length, 1); assert.deepEqual(result.authors, []);
});

function loadModule<T>(file: string, dependencies: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const local = { exports: {} };
  new Function("require", "module", "exports", code)((id: string) => { assert.ok(Object.hasOwn(dependencies, id), id); return dependencies[id]; }, local, local.exports);
  return local.exports as T;
}
const { queryEventsForArtist } = loadModule<typeof import("../src/lib/events.ts")>("src/lib/events.ts", {
  "@/lib/supabase/client": {}, "@/lib/artists": artists, "@/lib/artistPageData": artistPageData,
  "@/lib/eventDisplay": eventDisplay, "@/lib/eventTitle": eventTitle,
});
test("strict server event lookup rejects a partial/failed artist query", async () => {
  const { client } = clientFor({ events: { data: null, error: { message: "offline" } } });
  await assert.rejects(queryEventsForArtist(client, "number-i", { throwOnError: true }), /could not be loaded/);
  assert.deepEqual(await queryEventsForArtist(client, "number-i"), []); // existing browser compatibility
});
function seoWith(responses: Record<string, Result>) {
  return loadModule<typeof import("../src/lib/seoData.ts")>("src/lib/seoData.ts", {
    react: { cache: (fn: unknown) => fn }, "@/lib/artists": artists, "@/lib/events": { queryEventsForArtist: async () => events },
    "@/lib/eventTitle": eventTitle, "@/lib/eventDisplay": eventDisplay, "@/lib/og/eventOgData": {}, "@/lib/og/reportOgData": {},
    "@/lib/supabase/client": { supabase: clientFor(responses).client },
  });
}
test("metadata counts reject failures instead of issuing noindex for a false zero", async () => {
  const seo = seoWith({ setlists: { data: null, error: { message: "offline" } }, after_reports: { data: [], error: null }, official_news_public: { count: null, error: { message: "offline" } } });
  await assert.rejects(seo.getArtistContentCounts("number-i"), /counts could not be loaded/);
  await assert.rejects(seo.getArtistNewsCount("number-i"), /count could not be loaded/);
});
test("successful zero counts still remain zero", async () => {
  const seo = seoWith({ setlists: { data: [], error: null }, after_reports: { data: [], error: null }, official_news_public: { count: 0, error: null } });
  assert.deepEqual(await seo.getArtistContentCounts("number-i"), { setlists: 0, afterReports: 0 });
  assert.equal(await seo.getArtistNewsCount("number-i"), 0);
});

function venueWith(result: Result) {
 return loadModule<typeof import("../src/lib/venueSeo.ts")>("src/lib/venueSeo.ts", {
  "server-only": {}, "next/cache": {unstable_cache:(fn:unknown)=>fn},
  "@/lib/artistPageData": artistPageData, "@/lib/artists": artists,
  "@/lib/eventCrawlerConfig": {VENUES:[{id:"tokyo-dome",name:"東京ドーム"}],getVenueIdAliases:(id:string)=>[id]},
  "@/lib/eventTitle": eventTitle, "@/lib/eventDisplay": eventDisplay,
  "@/lib/seoData": {isTestEvent:()=>false},
  "@/lib/supabase/public": {createSupabasePublicClient:()=>clientFor({events:result}).client},
 });
}
test("venue lookup failure must not be cached or displayed as a successful empty program",async()=>{
 await assert.rejects(venueWith({data:null,error:{message:"offline"}}).getVenueEvents("tokyo-dome"),/Venue event read failed/);
 assert.deepEqual(await venueWith({data:[],error:null}).getVenueEvents("tokyo-dome"),[]);
});
