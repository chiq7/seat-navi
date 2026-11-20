import assert from "node:assert/strict";
import test from "node:test";
import { fetchFreshPublicData } from "@/lib/publicDataRefresh";
import { filterPublishedFeedItems } from "@/lib/realtimeFeed";
import { getRealtimeFeedItems, type HomeFeedItem } from "@/lib/homeData";
import type { SupabaseClient } from "@supabase/supabase-js";

const now = Date.parse("2026-11-13T13:30:00Z");
const item = (source: HomeFeedItem["source"], id = source): HomeFeedItem => ({
  id, source, type: "座席報告", detail: "アリーナB14 9列5番", artistName: "YOASOBI",
  venue: "札幌ドーム", date: "2026-11-15", createdAt: new Date(now - 1000).toISOString(),
  href: "/events/example", xHandle: null,
});

test("legacy R2 examples and countdowns never enter the published feed; original links survive", () => {
  const reports = [item("sample"), item("editorial"), item("real"), {
    ...item("collection"), sourceUrl: "https://x.com/i/web/status/2119788353768022342",
  }];
  const result = filterPublishedFeedItems(reports, now);
  assert.deepEqual(result.map(row => row.source), ["real", "collection"]);
  assert.equal(result[1].sourceUrl, reports[3].sourceUrl);
  assert.equal(result[1].href, "/events/example");
  assert.deepEqual(filterPublishedFeedItems(reports.slice(0, 2), now), []);
});

test("expired X observations stay excluded without discarding other published sources", () => {
  const old = { ...item("collection"), sourceUrl: "https://x.com/i/web/status/2119788353768022342", createdAt: new Date(now - 21 * 60 * 60 * 1000).toISOString() };
  assert.deepEqual(filterPublishedFeedItems([old, item("real")], now).map(row => row.source), ["real"]);
});

test("zero actual reports returns an honest empty feed even with upcoming performances", async () => {
  const tables: string[] = [];
  const query = new Proxy({}, { get: (_target, key) => key === "then"
    ? (resolve: (data: unknown) => void) => resolve({ data: [], error: null })
    : () => query });
  const client = { from(table: string) { tables.push(table); return query; } } as unknown as SupabaseClient;
  const result = await getRealtimeFeedItems(client, 20, [{ id: "show", artist: "YOASOBI", artistSlug: "yoasobi", eventName: "Live", date: "11/15", dateIso: "2026-11-15", period: "11/15", venue: "札幌ドーム", count: "0" }], true);
  assert.deepEqual(result, []);
  assert.ok(tables.includes("seat_reports"));
  assert.ok(!tables.includes("events"), "must not read upcoming events to manufacture extra items");
});

test("a stalled request times out, then a new attempt succeeds using the same lifetime signal", async () => {
  const lifetime = new AbortController();
  let attempts = 0;
  const signals: AbortSignal[] = [];
  const fetcher: typeof fetch = async (_url, options) => {
    signals.push(options!.signal as AbortSignal);
    if (++attempts === 1) return new Promise<Response>(() => {});
    return new Response(JSON.stringify([item("real")]), { headers: { "X-Tixrepo-Data-Updated-At": "2026-11-13T13:00:00Z" } });
  };
  await assert.rejects(fetchFreshPublicData("/feed", { signal: lifetime.signal, fetcher, timeoutMs: 15 }), { name: "TimeoutError" });
  assert.equal(signals[0].aborted, true);
  assert.equal(lifetime.signal.aborted, false);
  const recovered = await fetchFreshPublicData<HomeFeedItem[]>("/feed", { signal: lifetime.signal, fetcher, timeoutMs: 100 });
  assert.equal(attempts, 2);
  assert.equal(signals[1].aborted, false);
  assert.equal(recovered.data[0].source, "real");
  assert.equal(recovered.updatedAt, "2026-11-13T13:00:00Z");
  assert.equal(recovered.staleAt, null);
  assert.ok(Number.isFinite(Date.parse(recovered.checkedAt)));
});

test("the deadline covers a stalled response body, not only response headers", async () => {
  const fetcher = async () => ({ ok: true, json: () => new Promise(() => {}) }) as Response;
  await assert.rejects(fetchFreshPublicData("/feed", { fetcher: fetcher as typeof fetch, timeoutMs: 15 }), { name: "TimeoutError" });
});

test("unmount cancellation stops a pending request without waiting for its deadline", async () => {
  const lifetime = new AbortController();
  const promise = fetchFreshPublicData("/feed", { signal: lifetime.signal, timeoutMs: 1000,
    fetcher: async () => new Promise<Response>(() => {}) });
  lifetime.abort();
  await assert.rejects(promise, { name: "AbortError" });
});

test("saved data retains its source timestamp and cannot be reported as a fresh update", async () => {
  const result = await fetchFreshPublicData("/feed", { fetcher: async () => new Response("[]", {
    headers: { "X-Tixrepo-Data-Stale": "1", "X-Tixrepo-Data-Updated-At": "2026-11-12T09:00:00Z" },
  }) });
  assert.equal(result.staleAt, "2026-11-12T09:00:00Z");
  assert.notEqual(result.checkedAt, result.staleAt);
});
