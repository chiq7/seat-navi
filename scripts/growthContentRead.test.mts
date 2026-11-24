import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as setlistSeo from "../src/lib/setlistSeo.ts";
import { readSupabasePages } from "../src/lib/supabase/readPages.ts";
import * as setlistHelpers from "../src/lib/setlistHelpers.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { queryPublicAfterReports, queryPublicSetlists, selectInitialSetlist } from "../src/lib/publicArtistContent.ts";
import type { CrawledEvent } from "../src/lib/types.ts";
import type { EditableItem } from "../src/lib/setlistHelpers.ts";
import * as artists from "../src/lib/artists.ts";
import * as eventTitle from "../src/lib/eventTitle.ts";
import * as eventDisplay from "../src/lib/eventDisplay.ts";
import * as artistPageData from "../src/lib/artistPageData.ts";
import * as resalePolicy from "../src/lib/external-seats/sourcePolicy.ts";
import * as xSeatPosts from "../src/lib/external-seats/xSeatPosts.ts";
import * as eventIndexContent from "../src/lib/eventIndexContent.ts";
import * as eventPublication from "../src/lib/eventPublication.ts";
import * as liveReportSeo from "../src/lib/liveReportSeo.ts";
import * as reviewedEventDates from "../src/lib/reviewedEventDates.ts";
import * as eventArenaPhotos from "../src/lib/eventArenaPhotos.ts";
import * as publicVenueGuides from "../src/lib/publicVenueGuides.ts";
import * as venueActivity from "../src/lib/venueActivity.ts";
import * as seatSourceArchive from "../src/lib/seatSourceArchive.ts";
import { publishedSeatSourceEventIds } from "../src/lib/seatSourceArchive.ts";
import * as metadata from "../src/lib/metadata.ts";
import * as realtimeFeed from "../src/lib/realtimeFeed.ts";

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
    for (const method of ["select", "in", "eq", "is", "or", "not", "gte", "order", "limit"]) {
      query[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return query; };
    }
    query.range = (from: number, to: number) => {
      const response = responses[table];
      if (!Array.isArray(response.data)) return response;
      const data = response.data.slice(from, to + 1).map(row => table === "setlists" ? { ...row, id: row.event_id } : row);
      return { ...response, data, count: response.data.length };
    };
    return query;
  } };
  return { client: client as unknown as SupabaseClient, calls };
}

test("the latest show with songs opens first; with no songs anywhere the nearest upcoming show opens", () => {
  assert.deepEqual(selectInitialSetlist(events, records, "2026-10-31"), { eventId: "recent", items, source: null });
  assert.deepEqual(selectInitialSetlist(events, [], "2026-10-31"), { eventId: "next", items: [], source: null });
  assert.deepEqual(selectInitialSetlist(events, records, "2026-10-31", "recent"), { eventId: "recent", items, source: null });
});
test("explicit submission links retain an empty upcoming performance", () => {
  assert.deepEqual(selectInitialSetlist(events, records, "2026-10-31", "next"), { eventId: "next", items: [], source: null });
});
test("foreign performance links and records cannot be adopted", () => {
  for (const invalid of ["other-artist", "missing", ""]) {
    assert.deepEqual(selectInitialSetlist(events, records, "2026-10-31", invalid), { eventId: null, items: [], source: null });
  }
});
test("empty records use upcoming or most recent past without fabricating songs", () => {
  assert.deepEqual(selectInitialSetlist(events, [], "2026-10-31"), { eventId: "next", items: [], source: null });
  assert.deepEqual(selectInitialSetlist(events.slice(0, 2), [], "2026-10-31"), { eventId: "recent", items: [], source: null });
  assert.deepEqual(selectInitialSetlist([], records, "2026-10-31"), { eventId: null, items: [], source: null });
  const undated = { ...events[0], id: "undated", date: null };
  assert.equal(selectInitialSetlist([undated], [], "2026-10-31").eventId, null);
  assert.equal(selectInitialSetlist([undated], [], "2026-10-31", "undated").eventId, "undated");
  assert.equal(selectInitialSetlist([undated, { ...events[0], id: "today", date: "2026-10-31" }, ...events], [], "2026-10-31").eventId, "today");
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
  assert.deepEqual(await queryPublicSetlists(client, events), records.slice(0, 2).map(row => ({ ...row, source: null })));
  assert.deepEqual(calls.find(call => call.method === "in")?.args, ["event_id", ["old", "recent", "next"]]);
});
test("same-day review keeps the explicit performance and source", async () => {
  const noon = { ...event("day", "2026-06-06"), title: "BUDDiiS FLORiiA（1部・開演13:00）" };
  const night = { ...event("night", "2026-06-06"), title: "BUDDiiS FLORiiA（2部・開演18:00）" };
  const source = { kind: "official_recording", url: "https://example.com/recording" };
  const nightItems: EditableItem[] = [{ id: "night-song", type: "song", title: "夜公演の曲" }];
  const { client } = clientFor({ setlists: { data: [
    { event_id: noon.id, items }, { event_id: night.id, items: nightItems, review_source: source },
  ], error: null } });
  const results = await queryPublicSetlists(client, [noon, night]);
  assert.deepEqual(selectInitialSetlist([noon, night], results, "2026-11-16", night.id), { eventId: night.id, items: nightItems, source });
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
  const code = ts.transpileModule(readFileSync(file, "utf8"), { fileName: file, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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
function seoWith(responses: Record<string, Result>, archivedArtists: string[] = []) {
  return loadModule<typeof import("../src/lib/seoData.ts")>("src/lib/seoData.ts", {
  "@/data/hiddenLiveReports": { excludeHiddenLiveReports: (query: unknown) => query, isHiddenLiveReport: () => false },
    "@/lib/setlistHelpers": setlistHelpers,
    "@/lib/eventIndexContent": eventIndexContent,
    "@/lib/eventPublication": eventPublication,
    "@/lib/liveReportSeo": liveReportSeo,
    "@/lib/reviewedEventDates": reviewedEventDates,
    "@/lib/eventArenaPhotos": eventArenaPhotos,
    "@/lib/publicVenueGuides": publicVenueGuides,
    "@/lib/venueActivity": venueActivity,
    "@/lib/seatSourceArchive": seatSourceArchive,
    "@/lib/archiveArtistsWithSongs.json": { default: archivedArtists },
    "@/lib/setlistSeo": setlistSeo,
    "@/lib/artistPageData": { getJstDateString: () => "2026-11-17" },
    "@/lib/supabase/readPages": { readSupabasePages },
  react: { cache: (fn: unknown) => fn }, "@/lib/artists": artists, "@/lib/events": { queryEventsForArtist: async () => events, catalogEventsForArtist: (rows: CrawledEvent[], slug: string) => rows.filter(row => row.artist_slug === slug) },
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

const emptyDrafts = [[], null, [{ type: "mc" }], [{ type: "song", title: "  " }]];
function contentResponses(setlists: unknown[]) {
  return { events: { data: events, error: null }, setlists: { data: setlists, error: null },
    after_reports: { data: [], error: null }, seat_reports: { data: [], error: null },
    event_ticket_results: { data: [], error: null }, external_seat_observations: { data: [], error: null },
    fan_seat_predictions: { data: [], error: null }, official_news_public: { data: [], error: null } };
}
test("empty drafts and structural markers are not searchable setlist content", async () => {
  for (const draft of emptyDrafts) {
    const seo = seoWith(contentResponses([{ event_id: "recent", items: draft }]));
    assert.deepEqual(await seo.getArtistContentCounts("number-i"), { setlists: 0, afterReports: 0 });
    assert.deepEqual((await seo.getSeoSitemapData()).setlistArtists, []);
  }
});
test("a genuine song remains counted and included in the sitemap without modifying its content", async () => {
  const row = { event_id: "recent", items, created_at: "2026-10-01", updated_at: "2026-10-02" };
  const before = structuredClone(row);
  const seo = seoWith(contentResponses([row, { event_id: "old", items: [] }]));
  assert.equal((await seo.getArtistContentCounts("number-i")).setlists, 1);
  assert.deepEqual((await seo.getSeoSitemapData()).setlistArtists, [{ slug: "number-i", lastModified: "2026-10-02" }]);
  assert.deepEqual(row, before);
});
test("sitemap read failure is not published as a shortened successful sitemap", async () => {
  const responses = contentResponses([]);
  await assert.rejects(seoWith({ ...responses, setlists: { data: null, error: { message: "offline" } } }).getSeoSitemapData(), /Sitemap content could not be loaded/);
});
test("realtime feed excludes empty setlist updates while retaining actual songs and reports", async () => {
  const feedEvents = events.map(e => ({ ...e, date: "2020-01-01" }));
  const drafts = emptyDrafts.map((draft, i) => ({ id: `empty-${i}`, event_id: "old", items: draft, created_at: "2020-01-02" }));
  const { client, calls } = clientFor({ ...contentResponses([...drafts, { id: "real", event_id: "recent", items, created_at: "2020-01-02" }]),
    events: { data: feedEvents, error: null }, event_ticket_results: { data: [], error: null },
    external_seat_observations: { data: [], error: null }, seat_reports: { data: [], error: null },
    after_reports: { data: [{ id: "report", event_id: "old", created_at: "2020-01-03" }], error: null } });
  const home = loadModule<typeof import("../src/lib/homeData.ts")>("src/lib/homeData.ts", {
  "@/data/hiddenLiveReports": { excludeHiddenLiveReports: (query: unknown) => query, isHiddenLiveReport: () => false },
    "@/lib/artists": artists, "@/lib/eventTitle": eventTitle, "@/lib/setlistHelpers": setlistHelpers,
    "@/lib/setlistSeo": setlistSeo,
    "@/lib/artistPageData": { getJstDateString: () => "2026-11-17" },
    "@/lib/supabase/readPages": { readSupabasePages },
    "@/lib/artistPageData": artistPageData, "@/lib/external-seats/sourcePolicy": resalePolicy,
    "@/lib/external-seats/xSeatPosts": xSeatPosts, "@/lib/realtimeFeed": realtimeFeed,
    "@/lib/artistPageHelpers": { fmtDate: (date: string) => date, seatAreaLabel: (area: string) => area },
  });
  const feed = await home.getRealtimeFeedItems(client, 20, []);
  assert.ok(calls.some(call => call.table === "setlists" && call.method === "is" && call.args[0] === "review_source" && call.args[1] === null));
  assert.deepEqual(feed.filter(item => item.source === "real").map(item => item.id), ["現地レポ-report", "セトリ-real"]);
});

function venueWith(result: Result) {
 return loadModule<typeof import("../src/lib/venueSeo.ts")>("src/lib/venueSeo.ts", {
  "server-only": {}, "next/cache": {unstable_cache:(fn:unknown)=>fn},
  "@/lib/artistPageData": artistPageData, "@/lib/artists": artists,
  "@/lib/eventCrawlerConfig": {VENUES:[{id:"tokyo-dome",name:"東京ドーム"}],getVenueIdAliases:(id:string)=>[id]},
  "@/lib/publicEventCatalogContext": {getRequestPublicEventCatalog:async()=>null},
  "@/lib/eventTitle": eventTitle, "@/lib/eventDisplay": eventDisplay,
  "@/lib/seoData": {isTestEvent:()=>false},
  "@/lib/supabase/public": {createSupabasePublicClient:()=>clientFor({events:result}).client},
 });
}
test("venue lookup failure must not be cached or displayed as a successful empty program",async()=>{
 await assert.rejects(venueWith({data:null,error:{message:"offline"}}).getVenueEvents("tokyo-dome"),/Venue event read failed/);
 assert.deepEqual(await venueWith({data:[],error:null}).getVenueEvents("tokyo-dome"),[]);
});

test("a verified tour without an artist directory row uses its credited name only for that tour", async () => {
  const {getEventPageText} = await import("../src/lib/eventPageMetadata.ts");
  const show = { ...events[1], id:"48f562da18ef20e0e8d5", artist_slug:null, venue:"有明アリーナ", venue_id:"ariake-arena",
    date:"2026-10-27", title:"BUMP OF CHICKEN TOUR 2026-2027 Ratio Clavis" };
  assert.equal(artists.resolveArtist(show), undefined);
  const result = getEventPageText(show, undefined, 4);
  assert.equal(result.title, "BUMP OF CHICKEN 有明アリーナの座席表・見え方・感想（2026年10月27日） - ちけレポ");
  assert.ok(result.description.startsWith("BUMP OF CHICKENの有明アリーナ公演"));
  assert.equal(result.name, show.title);
  const other = { ...show, title:"有明カバーフェス BUMP OF CHICKEN 特集" };
  assert.ok(getEventPageText(other, undefined, 0).title.startsWith(other.title));
});

test("headliners for verified non-directory shows use their official credit, and the jazz series retains the event name", async () => {
  const {getEventPageText, getEventPerformerName} = await import("../src/lib/eventPageMetadata.ts");
  for (const [title, name] of [
    ["Vaundy DOME TOUR 2026", "Vaundy"], ["JANET JACKSON JAPAN 2026","JANET JACKSON"],
    ["超ときめき♡宣伝部のきみのハートにロックオンTOUR 2026","超ときめき♡宣伝部"], ["サカナクション","サカナクション"],
    ["LOVE JAZZ TIME 2026", undefined],
  ] as const) {
    assert.equal(getEventPerformerName(title), name);
    assert.ok(getEventPageText({...events[1], title}, undefined, 0).title.startsWith((name ?? title) + " "));
  }
});

test("only long titles shorten the date while retaining the session and time and the description's full date", async () => {
  const {getEventPageText} = await import("../src/lib/eventPageMetadata.ts");
  const artist = "この長い名称は本番データに登録しない検索タイトルの長さ確認用アーティスト";
  for (const session of ["1部・開演13:30","2部・開演18:00"]) {
    const show = { ...events[1], title: artist + " TOUR（" + session + "）" };
    const data = getEventPageText(show, artist, 0);
    assert.ok(data.title.endsWith("（2026/10/1・" + session + "） - ちけレポ"));
    assert.ok(data.description.includes("（2026年10月1日・" + session + "）"));
    const unknown = getEventPageText(show, undefined, 0);
    assert.ok(unknown.title.includes(session));
    assert.ok(unknown.title.endsWith("（2026/10/1） - ちけレポ"));
  }
});

test("event metadata and sitemap switch together on the first and last real contribution", async () => {
  const responses: Record<string,Result> = contentResponses([]);
  const seo = seoWith(responses), {client} = clientFor(responses);
  const sessions = [
    { ...events[1], id:"noon", title:"Number_i LIVE TOUR（昼公演）" },
    { ...events[1], id:"night", title:"Number_i LIVE TOUR（夜公演）" },
    { ...events[1], id:"8a245469a779c68ec996", title:"Number_i LIVE 2024 No.O -ring-（1部・開演13:30）", date:"2024-06-19" },
    { ...events[1], id:"143e69b211c469756732", title:"Number_i LIVE 2024 No.O -ring-（2部・開演18:00）", date:"2024-06-19" },
    { ...events[1], id:"not-announced", date:null },
  ];
  const sapporoShows = [
    { ...events[1], id:"126f8954bd6a5a64d5ec", title:"YOASOBI ドームツアー", artist_slug:"yoasobi", venue:"札幌ドーム", venue_id:"sapporo-dome", date:"2026-11-14" },
    { ...events[1], id:"52a4927231b268c52cc6", title:"YOASOBI ドームツアー", artist_slug:"yoasobi", venue:"札幌ドーム", venue_id:"sapporo-dome", date:"2026-11-15" },
  ];
  const archived = Array.from(publishedSeatSourceEventIds, (id, n) => event(id, new Date(Date.UTC(2024, 8, n + 1)).toISOString().slice(0, 10)));
  assert.ok(archived.length > 0);
  let fallback: boolean | null = null;
  const {generateMetadata} = loadModule<typeof import("../src/app/events/[id]/page.tsx")>("src/app/events/[id]/page.tsx", {
    "react/jsx-runtime": {}, "next/navigation": {}, react:{cache:(fn:unknown)=>fn},
    "./EventDetailClient":{}, "./EventVenuePhotos":{}, "./EventTourDates":{}, "@/lib/serverPerformanceReportCount":{},
    "@/components/venue/SeatSourceArchive":{}, "@/lib/seatSourceArchive":await import("../src/lib/seatSourceArchive.ts"),
    "@/components/seo/PublicAlternateNames":{}, "@/lib/publicAlternateNames":{},
    "@/components/arena-map/EventArenaPhotoMap":{}, "@/lib/eventArenaPhotos":eventArenaPhotos,
    "@/lib/serverSeatPhotoVenues":await import("../src/lib/serverSeatPhotoVenues.ts"), "@/lib/structuredData":{}, "@/lib/seoProfiles":{},
    "@/lib/serverEventData":{}, "@/lib/metadata":metadata, "@/lib/serverStatsData":{}, "@/data/eventDayPublications":{},
    "@/lib/eventDayPublication":{}, "@/lib/publicVenueGuides":await import("../src/lib/publicVenueGuides.ts"), "@/lib/eventIndexContent":eventIndexContent,
    "@/lib/setlistHelpers":await import("../src/lib/setlistHelpers.ts"), "@/lib/setlistSeo":await import("../src/lib/setlistSeo.ts"),
    "@/lib/eventPublication":eventPublication, "@/lib/eventPageMetadata":await import("../src/lib/eventPageMetadata.ts"),
    "@/lib/publicEventCatalogContext":{getRequestPublicEventCatalog:async()=>({events: [...events, ...sessions, ...sapporoShows, ...archived]}),getFallbackEventIndex:async()=>fallback},
    "@/lib/supabase/public":{createSupabasePublicClient:()=>client}, "@/lib/seoData":seo, "@/lib/eventDisplay":eventDisplay,
    "@/lib/og/eventOgData":{describePublicEvent:(row:CrawledEvent)=>({event:row,artist:artists.resolveArtist(row),tourName:row.title,dateLabel:row.date,isTestData:false})},
    "@/lib/events":{}, "@/lib/publicEventCatalog":{}, "@/lib/artistPageData":{getJstDateString:()=>"2026-10-01"},
  });
  const props = {params:Promise.resolve({id:"recent"})};
  for (const show of sessions) {
    const meta = await generateMetadata({params:Promise.resolve({id:show.id})});
    const slots: Record<string,string> = {noon:"・昼公演",night:"・夜公演","8a245469a779c68ec996":"・1部・開演13:30","143e69b211c469756732":"・2部・開演18:00"};
    const slot = slots[show.id] ?? "";
    const date = show.date ? `（${show.date === "2024-06-19" ? "2024年6月19日" : "2026年10月1日"}${slot}）` : "";
    // Tokyo has six visible preview tiles at 0 reports (55 linked photos in the entire venue).
    assert.equal(meta.title, `【写真6枚】Number_i 東京ドームの座席・見え方${date} - ちけレポ`);
    assert.ok(meta.description?.includes(`Number_iの東京ドーム公演${date}`));
    assert.ok(meta.description?.includes("6枚掲載"));
    if (!show.date) assert.doesNotMatch(meta.description ?? "", /開催予定|開催される|開催された/);
  }
  // Both pages link to the same venue's gallery, which now has five photos (the title threshold); 11/15 adds its own arena photo.
  for (const show of sapporoShows) {
    const meta = await generateMetadata({params:Promise.resolve({id:show.id})});
    const day = Number(show.date.slice(-2));
    const expected = `【写真${day === 15 ? 6 : 5}枚】YOASOBI 札幌ドーム（大和ハウス プレミストドーム）の座席・見え方（2026年11月${day}日） - ちけレポ`;
    assert.equal(meta.title, expected);
    assert.equal(meta.openGraph?.title, expected);
    assert.equal(meta.twitter?.title, expected);
    assert.equal(meta.alternates?.canonical, `https://tixrepo.com/events/${show.id}`);
    assert.deepEqual(meta.openGraph?.images, [{url:`/api/og/event/${show.id}`, width:1200, height:630, alt:`YOASOBI 札幌ドーム（大和ハウス プレミストドーム） ${show.date}`}]);
  }
  for (const index of [false, true, false]) {
    responses.event_ticket_results={data:index?[{id:"win",event_id:"recent",created_at:null}]:[],error:null};
    assert.deepEqual((await generateMetadata(props)).robots,{index,follow:true});
    assert.equal((await seo.getSeoSitemapData()).events.some(e=>e.id==="recent"),index);
  }
  responses.seat_reports={data:null,error:{message:"offline"}};
  fallback=true;
  assert.deepEqual((await generateMetadata(props)).robots,{index:true,follow:true});
  fallback=null;
  await assert.rejects(generateMetadata(props),/unavailable/);
  // An archived event still renders its sources during a database or sitemap outage.
  for (const show of archived) {
    assert.deepEqual((await generateMetadata({params:Promise.resolve({id:show.id})})).robots,{index:true,follow:true});
  }
  responses.seat_reports={data:[],error:null};
  responses.events={data:[...events,...archived],error:null};
  const fromArchive=(await seo.getSeoSitemapData()).events;
  assert.deepEqual(new Set(fromArchive.map(row=>row.id)),new Set(archived.map(row=>row.id)));
  assert.ok(fromArchive.every(row=>row.lastModified === seatSourceArchive.seatSourcePublicationDates.events[row.id]));
  assert.equal((await eventIndexContent.readEventContributions(client, ["recent"])).latest.size,0);
  assert.equal((await eventIndexContent.readEventContributions(client, [archived[0].id])).latest.size,1);
});

test("artist social and search titles use its own gallery, retaining the artist-specific social image", async () => {
  const photoLedger = await import("../src/lib/serverSeatPhotoVenues.ts");
  const {generateMetadata} = loadModule<typeof import("../src/app/artists/[slug]/page.tsx")>("src/app/artists/[slug]/page.tsx", {
    "react/jsx-runtime": {}, "next/navigation": {}, react:{cache:(fn:unknown)=>fn}, "./ArtistClient":{},
    "@/components/seo/ArtistSeatSearchGuide":{}, "@/components/seo/PublicAlternateNames":{}, "@/components/common/SeatPhotoGallery":{},
    "@/lib/publicAlternateNames":await import("../src/lib/publicAlternateNames.ts"), "@/lib/artistSeatGuide":{},
    "@/lib/metadata":metadata, "@/lib/artistPageData":artistPageData, "@/lib/structuredData":{}, "@/lib/seoProfiles":{},
    "@/lib/seoData":{ getSeoArtist:artists.findArtistBySlug, isTestArtist:()=>false, SITE_URL: metadata.SITE_URL },
    "@/lib/serverEventData":{ getCachedArtistEvents:async()=>[] }, "@/lib/serverArtistContent":{},
    "@/lib/publicVenueGuides":publicVenueGuides, "@/lib/serverSeatPhotoVenues":photoLedger,
  });
  for (const slug of ["seventeen","number-i"]) {
    const artist = artists.findArtistBySlug(slug)!;
    const count = photoLedger.getArtistSeatPhotos(artist.name, []).length;
    assert.equal(count > 0, slug === "seventeen");
    const meta = await generateMetadata({params:Promise.resolve({slug})});
    const title = String(meta.title);
    assert.ok(title.startsWith((count >= 5 ? `【写真${count}枚】` : "") + artist.name));
    assert.ok(title.endsWith(" - ちけレポ"));
    assert.equal(meta.openGraph?.title, title);
    assert.equal(meta.twitter?.title, title);
    assert.equal(meta.openGraph?.siteName, "ちけレポ");
    assert.equal(meta.alternates?.canonical, `https://tixrepo.com/artists/${slug}`);
    assert.deepEqual(meta.robots, {index:true,follow:true});
    assert.deepEqual(meta.twitter?.images, [`/api/og/artist/${slug}`]);
  }
});

test("a single report makes an event eligible and removing it reverses the decision", async () => {
  for (const table of ["seat_reports", "event_ticket_results", "after_reports", "fan_seat_predictions", "external_seat_observations", "setlists"]) {
    const responses: Record<string, Result> = contentResponses([]);
    const seo = seoWith(responses);
    const client = clientFor(responses).client;
    for (const present of [false, true, false]) {
      responses[table] = { data: present ? [{ id: "p", event_id: "recent", created_at: null, items }] : [], error: null };
      const direct = await eventIndexContent.readEventContributions(client, ["recent"]);
      assert.equal(direct.latest.has("recent"), present, table);
      assert.deepEqual((await seo.getSeoSitemapData()).events.map(e => e.id), present ? ["recent"] : [], table);
    }
  }
});

test("unconfirmed dates stay excluded even with contributions, but a published day guide alone qualifies", async () => {
  const responses: Record<string,Result> = contentResponses([]);
  const unknown = [
    {...event("no-date","2026-10-01"), date:null},
    {...event("says-unknown","2026-10-02"), title:"Number_i TOUR（開催日未確認）"},
    {...event("says-pending","2026-10-03"), title:"Number_i TOUR（日程未定）"},
  ];
  const guide = { ...event("93dec1e9b401d54ac03e","2026-09-19"),
    venue:"京セラドーム大阪", venue_id:"kyocera-dome",artist_slug:"stray-kids",title:"Stray Kids World Tour 〈 RUN IT JAPAN 〉"};
  responses.events={data:[...unknown,guide],error:null};
  responses.seat_reports={data:unknown.map(row=>({id:"report-"+row.id,event_id:row.id,created_at:"2026-10-01"})),error:null};
  const result=await seoWith(responses).getSeoSitemapData();
  assert.deepEqual(result.events.map(row=>row.id),[guide.id]);
  assert.ok(eventPublication.performanceEditorialContent(guide,[guide.id],"stray-kids").dayHref);
  for(const row of unknown) assert.equal(eventPublication.canIndexEvent(row,eventPublication.performanceEditorialContent(row,[row.id],"number-i"),true),false);
});

test("event totals preserve multiple reports, songs only and counts per contribution kind", async () => {
  const responses: Record<string,Result> = contentResponses([{id:"songs",event_id:"recent",items},{id:"draft",event_id:"old",items:[]}]);
  responses.seat_reports={data:[{id:"a",event_id:"recent"},{id:"b",event_id:"recent"}],error:null};
  responses.after_reports={data:[{id:"c",event_id:"recent"}],error:null};
  const result=await eventIndexContent.readEventContributions(clientFor(responses).client,["recent","old"]);
  assert.deepEqual(result.counts, {seat_reports:2,event_ticket_results:0,fan_seat_predictions:0,
    external_seat_observations:0,after_reports:1,setlists:1});
});
test("an empty setlist draft or an inaccessible table cannot supply evidence of a post", async () => {
  const responses: Record<string, Result> = contentResponses([{ event_id: "recent", items: [{type:"song",title:" "}] }]);
  const { client, calls } = clientFor(responses);
  assert.equal((await eventIndexContent.readEventContributions(client, ["recent"])).latest.size, 0);
  assert.ok(calls.some(c => c.table === "fan_seat_predictions" && c.method === "eq" && c.args[0] === "approved" && c.args[1] === true));
  assert.ok(calls.some(c => c.table === "external_seat_observations" && c.method === "eq" && c.args[0] === "review_status" && c.args[1] === "approved"));
  responses.event_ticket_results = {data:null,error:{message:"offline"}};
  await assert.rejects(eventIndexContent.readEventContributions(client, ["recent"]), /unavailable/);
});
test("a same-show alternate ID promotes only its canonical show, keeping other dates and sessions separate", async () => {
  const responses: Record<string, Result> = contentResponses([]);
  const dated = event("evening-main", "2026-11-18");
  const main = {...dated, title:"Number_i 東京追加特別公演 夜公演"};
  const alternate = {...dated, id:"evening-alias", title:"Number_i LIVE 夜公演"};
  const daytime = {...dated, id:"daytime", title:"Number_i LIVE 昼公演"};
  const tomorrow = {...main, id:"other-date", date:"2026-11-19"};
  responses.events={data:[main,alternate,daytime,tomorrow],error:null};
  responses.event_ticket_results={data:[{id:"ticket",event_id:alternate.id,created_at:null}],error:null};
  assert.deepEqual((await seoWith(responses).getSeoSitemapData()).events.map(e=>e.id), [main.id]);
});
test("archived songs retain an otherwise empty artist setlist; live news does not depend on a timestamp", async () => {
  const responses: Record<string,Result> = contentResponses([]);
  responses.official_news_public = {data:[{id:"article",artist_slug:"number-i",created_at:null}],error:null};
  const data=await seoWith(responses, ["ado"]).getSeoSitemapData();
  assert.deepEqual(data.setlistArtists.map(x=>x.slug), ["ado"]);
  assert.deepEqual(data.newsArtists.map(x=>x.slug), ["number-i"]);
  assert.deepEqual(data.events, []);
});
test("an artist's first and last report, news article, or song update only that section", async () => {
  const responses: Record<string,Result> = contentResponses([]);
  const seo=seoWith(responses);
  for(const [table,section] of [["official_news_public","newsArtists"],["after_reports","afterReportArtists"],["setlists","setlistArtists"]] as const){
    for(const present of [false,true,false]){
      responses[table]={data:present?[{id:"post",event_id:"recent",artist_slug:"number-i",created_at:null,items}]:[],error:null};
      const data=await seo.getSeoSitemapData();
      assert.deepEqual(data[section].map(row=>row.slug),present?["number-i"]:[]);
    }
  }
});
