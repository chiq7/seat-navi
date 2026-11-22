import assert from "node:assert/strict";
import test from "node:test";
import { TRAFFIC_LOG_EXCLUSION_COOKIE } from "../src/lib/analyticsTraffic.ts";
import { publicNavigationLog } from "../src/lib/navigationLog.ts";
import * as homeData from "../src/lib/homeData.ts";
import * as eventCrawler from "../src/lib/eventCrawler.ts";
import { publishSitemapSnapshot, readSitemapSnapshot, type SitemapSnapshotStore } from "../src/lib/sitemapSnapshot.ts";
import { readSupabasePages } from "../src/lib/supabase/readPages.ts";
import * as workersAiEvents from "../src/lib/workersAiEvents.ts";

// The collection feed and the Workers AI comparison come from the Cloudflare Free worktree (615a0f1). The production
// source snapshot (759cbe3) does not ship them, so their tests skip until that work lands instead of failing the run.
type Fn = (...args: any[]) => any;
const unreleased = "not in the production source yet (Cloudflare Free work, 615a0f1)";
const collectionFeedCandidates = (homeData as Record<string, unknown>).collectionFeedCandidates as Fn | undefined;
const extractEventsWithModel = (eventCrawler as Record<string, unknown>).extractEventsWithModel as Fn | undefined;
const workersAiEventModel = (workersAiEvents as Record<string, unknown>).workersAiEventModel as Fn | undefined;

const documentResponse = new Response("", { headers: { "Content-Type": "text/html; charset=utf-8" } });
const page = "https://tixrepo.com/venues/zozo-marine";

function log(url: string, headers: Record<string, string> = {}, response = documentResponse) {
  const request = new Request(url, { headers: { accept: "text/html", "sec-fetch-mode": "navigate", ...headers } });
  return publicNavigationLog(request, new URL(url), response);
}

test("X referrers retain only a public short link or a post ID", () => {
  const short = log(`${page}?utm_source=x&utm_medium=social&utm_campaign=seats&utm_content=xpost-123456789&token=private`, {
    referer: "https://t.co/Ab9x?session=private",
  });
  assert.deepEqual(short, {
    kind: "public_navigation", landingPath: "/venues/zozo-marine", referrerHost: "t.co", previousPath: null,
    source: "x", taggedSource: "x", inApp: null, xShortUrl: "https://t.co/Ab9x", xPostId: "123456789", xPostSignal: "tag",
  });
  const post = log(page, { referer: "https://x.com/example/status/123456789?token=private" });
  assert.equal(post?.xPostId, "123456789");
  assert.equal(post?.xPostSignal, "referrer");
  assert.ok(!JSON.stringify(post).includes("example"));
  const originOnly = log(page, { referer: "https://t.co/" });
  assert.equal(originOnly?.source, "x");
  assert.equal(originOnly?.xShortUrl, null);
});

test("previous paths are limited to public site paths and app signals stay separate", () => {
  const sameSite = log(page, { referer: "https://tixrepo.com/search?q=private#secret" });
  assert.equal(sameSite?.previousPath, "/search");
  assert.equal(log(page, { referer: "https://tixrepo.com/auth/callback?code=private" })?.previousPath, null);
  const search = log(page, { referer: "https://www.google.co.jp/search?q=private" });
  assert.equal(search?.source, "search");
  assert.equal(search?.referrerHost, "www.google.co.jp");
  assert.ok(!JSON.stringify(search).includes("private"));
  const line = log(page, { "user-agent": "Mobile Safari Line/15.0" });
  assert.equal(line?.source, "unknown");
  assert.equal(line?.inApp, "line");
  assert.equal(log(page, { "user-agent": "Mobile MicroMessenger/8.0" })?.inApp, "wechat");
  assert.equal(log(page, { referer: "https://x.com.example.org/status/123456789" })?.source, "external");
});

test("preview, prefetch, non-HTML, private paths and marked QA are excluded from navigation logs", () => {
  assert.equal(log("https://tixrepo.2222color.workers.dev/venues/zozo-marine"), null);
  assert.equal(log(page, { rsc: "1" }), null);
  assert.equal(log(page, { "sec-purpose": "prefetch" }), null);
  assert.equal(log(page, { "sec-fetch-mode": "cors" }), null);
  assert.equal(log(page, { "user-agent": "Googlebot" }), null);
  assert.equal(log(page, { "sec-gpc": "1" }), null);
  assert.equal(log(page, { cookie: `session=private; ${TRAFFIC_LOG_EXCLUSION_COOKIE}=1` }), null);
  assert.equal(log("https://tixrepo.com/login?token=private"), null);
  assert.equal(log(page, {}, new Response("", { status: 404, headers: { "Content-Type": "text/html" } })), null);
});

test("collected seat cards retain official sources and group duplicate observations", { skip: collectionFeedCandidates ? false : unreleased }, () => {
  const created_at = "2026-11-09T02:00:00Z";
  const candidates = collectionFeedCandidates!([
    { id: "bad", event_id: "event-a", created_at, source_url: "https://t.pia.jp.example.com/listing" },
    { id: "seat-a", event_id: "event-a", created_at, source_url: "https://t.pia.jp/listing" },
    { id: "seat-b", event_id: "event-a", created_at, source_url: "https://t.pia.jp/listing" },
  ], [{ id: "event-b", created_at }]);
  assert.deepEqual(candidates.map(item => item.id), ["external-seat-seat-a", "new-event-event-b"]);
  assert.equal(candidates[0].collection?.sourceUrl, "https://t.pia.jp/listing");
  assert.equal(candidates[1].collection?.sourceUrl, undefined);
});

test("sitemap snapshots are published only after validation and support HEAD and conditional GET", async () => {
  let xml: string | null = null;
  let meta: { etag: string } | null = null;
  let writes = 0;
  const store: SitemapSnapshotStore = {
    async getWithMetadata<T>() { return { value: xml, metadata: meta as T | null }; },
    async put(_key, value, options) { xml = value; meta = options.metadata; writes++; },
  };
  const url = "https://tixrepo.com/sitemap.xml";
  const entries = [{ url: "https://tixrepo.com/" }, { url: "https://tixrepo.com/events/one?a=1&b=2" }];
  assert.equal(await readSitemapSnapshot(new Request(url), store), null);
  assert.equal(await publishSitemapSnapshot(store, entries), "updated");
  assert.equal(await publishSitemapSnapshot(store, entries), "unchanged");
  await assert.rejects(() => publishSitemapSnapshot(store, [...entries, entries[1]]));
  assert.equal(writes, 1);
  const get = await readSitemapSnapshot(new Request(url), store);
  assert.ok(get);
  assert.match(await get.text(), /a=1&amp;b=2/);
  const head = await readSitemapSnapshot(new Request(url, { method: "HEAD" }), store);
  assert.equal(await head?.text(), "");
  const cached = await readSitemapSnapshot(new Request(url, { headers: { "If-None-Match": `W/${get.headers.get("etag")}` } }), store);
  assert.equal(cached?.status, 304);
});

test("sitemap source reads include pages beyond PostgREST's first 1,000 rows", async () => {
  const records = Array.from({ length: 1_353 }, (_, index) => ({ id: String(index) }));
  const complete = await readSupabasePages(async (from, to) => ({ data: records.slice(from, to + 1), count: records.length, error: null }));
  assert.equal(complete.data.length, records.length);
  assert.equal(complete.limited, false);
  const missing = await readSupabasePages(async (from, to) => ({
    data: from >= 1_000 ? null : records.slice(from, to + 1), count: records.length, error: from >= 1_000 ? "read failed" : null,
  }));
  assert.equal(missing.limited, true);
  assert.equal(missing.error, "read failed");
});

test("Workers AI comparison uses structured events and rejects invalid rows", { skip: workersAiEventModel && extractEventsWithModel ? false : unreleased }, async () => {
  const expected = { title: "テスト公演", date: "2026-11-15", genre: "other" };
  const venue = { id: "test-venue", name: "テスト会場" };
  const model = workersAiEventModel!("@cf/example/test", async (_name: string, input: any) => {
    assert.equal(input.response_format.type, "json_schema");
    assert.match(input.messages[0].content, /テスト会場/);
    return { response: { events: [expected] } };
  });
  assert.deepEqual((await extractEventsWithModel!("11/15 テスト公演", venue, model)).events, [expected]);
  const invalid = workersAiEventModel!("@cf/example/test", async () => ({ response: { events: [{ title: "", date: 15, genre: "other" }] } }));
  const rejected = await extractEventsWithModel!("11/15 テスト公演", venue, invalid);
  assert.deepEqual(rejected.events, []);
  assert.match(rejected.error ?? "", /event schema/);
});
