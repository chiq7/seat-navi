import assert from "node:assert/strict";
import test from "node:test";
import { serveCatalogSitemap, fallbackSitemap, publishCatalogSitemap, sitemapHasEvent } from "../src/lib/eventCatalogSitemap.ts";
import { publishedSeatSourceEventIds } from "../src/lib/seatSourceArchive.ts";
import { sitemapXml, FILTERED_SITEMAP_ASSET } from "../src/lib/sitemapXml.ts";
const req = (etag?: string, method = "GET") => new Request("https://tixrepo.com/sitemap.xml", { method, headers: etag ? {"If-None-Match":etag} : {} });
const empty = sitemapXml([{ url: "https://tixrepo.com/" }]);
const full = sitemapXml([{ url: "https://tixrepo.com/" }, { url: "https://tixrepo.com/events/show" }]);

test("lastmod uses one UTC ISO format for both editorial dates and timezone-qualified timestamps", () => {
  const xml=sitemapXml([{url:"https://tixrepo.com/a",lastModified:"2026-11-18"},
    {url:"https://tixrepo.com/b",lastModified:"2026-11-19T01:10:00+09:00"}]);
  assert.deepEqual([...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(match=>match[1]),
    ["2026-11-18T00:00:00.000Z","2026-11-18T16:10:00.000Z"]);
});

test("sitemap rechecks additions and deletions even with a validator from the previous request", async () => {
  let current = empty;
  const serve = (request: Request) => serveCatalogSitemap(request, async () => current, async () => null);
  const first = await serve(req()), tag = first.headers.get("ETag")!;
  assert.equal(first.status,200);
  assert.equal(sitemapHasEvent(await first.text(),"show"),false);
  current = full;
  const updated = await serve(req(tag));
  assert.equal(updated.status,200);
  assert.equal(sitemapHasEvent(await updated.text(),"show"),true);
  const fullTag=updated.headers.get("ETag")!;
  assert.equal((await serve(req(fullTag,"HEAD"))).status,304);
  current = empty;
  assert.equal(sitemapHasEvent(await (await serve(req(fullTag))).text(),"show"),false);
});
test("on a failed read only the filtered backup is served, or a retryable error", async () => {
  const failed = async () => { throw Error("offline"); };
  const seen: string[] = [];
  const backup=()=>fallbackSitemap(undefined,{fetch:async r => {seen.push(new URL(r.url).pathname);return new Response(full)}}, "v");
  const result=await serveCatalogSitemap(req(),failed,backup);
  assert.equal(result.headers.get("X-Tixrepo-Data-Stale"),"1");
  assert.equal(await result.text(),full);
  assert.deepEqual(seen,[FILTERED_SITEMAP_ASSET]);
  const unavailable=await serveCatalogSitemap(req(),failed,async()=>null);
  assert.equal(unavailable.status,503);
  assert.equal(unavailable.headers.get("Cache-Control"),"no-store");
});

test("the new release's static and refreshed R2 fallback both retain linked seat archives", async () => {
  type Store = Parameters<typeof publishCatalogSitemap>[0];
  const xml = sitemapXml(Array.from(publishedSeatSourceEventIds, id => ({ url: "https://tixrepo.com/events/"+id })));
  let stored = { xml: empty, meta: {workerVersion:"before"} as Record<string,string>, etag:"old" };
  const store: Store = {
    head: async () => ({customMetadata:stored.meta,etag:stored.etag}),
    get: async () => ({customMetadata:stored.meta,etag:stored.etag,body:new Response(stored.xml).body!,text:async()=>stored.xml}),
    put: async (_key,value,options) => {
      stored = {xml:value,meta:options.customMetadata,etag:"current"};
      return {customMetadata:stored.meta,etag:stored.etag};
    },
  };
  let staticReads=0;
  const fallback=()=>fallbackSitemap(store,{fetch:async()=>{staticReads++;return new Response(xml)}}, "current");
  const offline=async()=>{throw Error("offline")};
  // Before the first scheduled refresh the old R2 version must yield to the new static asset.
  const first=await serveCatalogSitemap(req(),offline,fallback);
  assert.equal(await first.text(),xml);
  assert.equal(staticReads,1);
  assert.equal((await publishCatalogSitemap(store,xml,"2026-11-19T00:00:00Z","current")).status,"updated");
  const after=await serveCatalogSitemap(req(),offline,fallback);
  assert.equal(await after.text(),xml);
  assert.equal(staticReads,1);
  assert.equal((await serveCatalogSitemap(req(first.headers.get("ETag")!),offline,fallback)).status,304);
  assert.equal(sitemapHasEvent(xml,"unlinked"),false);
});
