import assert from "node:assert/strict";
import test from "node:test";
import { GUIDE_HTML_TTL, isLocalPageCapture, servePublicGuidePage } from "../src/lib/workerPublicGuidePage.ts";

const artist = "/artists/number-i", venue = "/venues/tokyo-dome";
const origin = "https://tixrepo.com";
function document(path: string, source: string) {
  const canonical = origin + path;
  const profile = path.startsWith("/venues/") ? "place" : "artist";
  const sections = profile === "artist"
    ? '<a href="#ticket-data">当落を見る</a><section id="ticket-data">当落・座席データ</section><a href="#fan-board">ファン掲示板</a><section id="fan-board">ファン掲示板</section>'
    : '<h2 id="seat-reading-title">座席表</h2><h2 id="seat-photo-title">写真</h2><section id="venue-seat-guide" data-published-photos="1"><ul id="seat-photo-inventory"><li>座席写真</li></ul></section>';
  return `<html><head><title>会場ガイド</title><meta name="description" content="座席表"><link rel="canonical" href="${canonical}"></head><body><h1>${source}</h1><script type="application/ld+json">{"@id":"${canonical}#${profile}"}</script>${sections}</body></html>`;
}
function makeResponse(path: string, source: string, flight = false) {
  const canonical = origin + path;
  const body = flight ? `0:{"__route":"route:${path}","initialEvents":[],"id":"seat-reading-title","data-published-photos":1}\n1:${canonical}#artist rel="canonical" href="${canonical}"`
    : document(path, source);
  return new Response(body, { headers: { "Content-Type": flight ? "text/x-component" : "text/html" } });
}
function harness() {
  let time = 0;
  const rows = new Map<string,{ expires: number; response: Response }>();
  const renderRequests: Request[] = [], assetRequests: Request[] = [];
  const cache = {
    async match(key: Request) {
      const row = rows.get(key.url);
      return row && row.expires > time ? row.response.clone() : undefined;
    },
    async put(key: Request, response: Response) {
      const seconds = Number(response.headers.get("Cache-Control")?.match(/max-age=(\d+)/)?.[1]);
      assert.ok(seconds > 0);
      rows.set(key.url, { expires: time + seconds, response });
    },
  };
  const services = {
    cache: async () => cache, release: "release-1", hasSession: false,
    async render(req: Request) {
      renderRequests.push(req);
      return makeResponse(new URL(req.url).pathname, "現在の公演一覧", req.headers.get("rsc") === "1");
    },
    assets: { async fetch(req: Request) {
      assetRequests.push(req);
      const file = new URL(req.url).pathname.replace("/_tixrepo/pages", "");
      return makeResponse(file.replace(/\.(html|rsc)$/, ""), "保存済み", file.endsWith(".rsc"));
    } },
  };
  const visit = (path: string, init?: RequestInit) => servePublicGuidePage(new Request(origin + path, init), services);
  return { services, rows, advance(seconds: number) { time += seconds; }, renderRequests, assetRequests, visit };
}

test("anonymous artist HTML shares 15 minutes across devices, bots and tracking links, HEAD cannot populate an empty entry", async () => {
  const h = harness();
  const head = await h.visit(artist+"?utm_source=x", {method:"HEAD",headers:{cookie:"_ga=123"}});
  assert.equal(await head.text(),"");
  assert.equal(head.headers.get("X-Tixrepo-Page-Cache"),"MISS");
  assert.equal(h.renderRequests[0].url, origin + artist);
  assert.equal(h.renderRequests[0].method,"GET");
  assert.equal(h.renderRequests[0].headers.has("cookie"),false);
  const hit = await h.visit(artist,{headers:{"User-Agent":"Googlebot"}});
  assert.match(await hit.text(),/現在の公演一覧/);
  assert.equal(hit.headers.get("X-Tixrepo-Page-Cache"),"HIT");
  h.advance(GUIDE_HTML_TTL - 1);
  assert.equal((await h.visit(artist)).headers.get("X-Tixrepo-Page-Cache"),"HIT");
  h.advance(1);
  assert.equal((await h.visit(artist)).headers.get("X-Tixrepo-Page-Cache"),"MISS");
  assert.equal(h.renderRequests.length,2);
  h.services.release = "release-2";
  assert.equal((await h.visit(artist)).headers.get("X-Tixrepo-Page-Cache"),"MISS");
});

test("venue documents use built assets, deep links remain public and HTML never supplies Flight", async () => {
  const h = harness();
  const page = await h.visit(venue+"?section=D22&photo=1");
  assert.match(await page.text(),/座席写真/);
  assert.equal(h.renderRequests.length,0);
  const flight = await h.visit(venue+"?_rsc", {headers:{RSC:"1"}});
  assert.equal(flight.headers.get("content-type"),"text/x-component");
  assert.match(await flight.text(),/^0:/);
  assert.equal(h.assetRequests.length,2);
  assert.equal((await h.visit(venue)).headers.get("X-Tixrepo-Page-Cache"),"HIT");
  const currentFlight = await h.visit(artist,{headers:{RSC:"1"}});
  assert.equal(currentFlight.headers.get("X-Tixrepo-Page-Delivery"),"ssr-rsc");
  assert.equal(h.renderRequests[0].url,origin+artist+"?_rsc");
});

test("authenticated, preview, non-read and varying router requests never enter the public cache", async () => {
  const h = harness();
  const samples: RequestInit[] = [
    { headers:{Authorization:"Bearer test"} }, {headers:{"Cookie":"__prerender_bypass=value"}},
    {headers:{RSC:"1","next-router-state-tree":"state"}}, {method:"POST"},
  ];
  for (const init of samples) assert.equal((await h.visit(artist,init)).headers.get("Cache-Control"),"private, no-store");
  h.services.hasSession = true;
  await h.visit(artist);
  assert.equal(h.rows.size,0);
  assert.equal(h.renderRequests.length,5);
  h.services.hasSession = false;
  const local = new Request("http://127.0.0.1:9000"+venue,{headers:{"X-Tixrepo-Prepare-Page":"1"}});
  assert.equal(isLocalPageCapture(local,new URL(local.url)),true);
  assert.equal(isLocalPageCapture(local,new URL(origin+venue)),false);
});

test("failed or soft-error SSR falls back to a validated snapshot; both corrupt fails as 503 and never caches", async () => {
  const h = harness();
  h.services.render = async()=>new Response(document(artist,"会場ガイドを読み込めませんでした。通信状態を確認してください。"),{headers:{"Content-Type":"text/html"}});
  const fallback = await h.visit(artist);
  assert.equal(fallback.status,200);assert.equal(fallback.headers.get("X-Tixrepo-Page-Cache"),"FALLBACK");
  assert.match(await fallback.text(),/保存済み/);
  assert.equal((await h.visit(artist)).headers.get("X-Tixrepo-Page-Cache"),"HIT");
  h.advance(61);
  h.services.assets.fetch = async()=>new Response("incomplete",{headers:{"Content-Type":"text/html"}});
  const down = await h.visit(artist);
  assert.equal(down.status,503);assert.equal(down.headers.get("Cache-Control"),"no-store");
  assert.equal(down.headers.get("Retry-After"),"60");
  h.services.render = async()=>new Response(document(artist,"private"),{headers:{"Content-Type":"text/html","Set-Cookie":"session=fake"}});
  assert.equal((await h.visit(artist)).status,503);
  h.services.render = async()=>makeResponse(venue,"再描画");
  const venueRecovered = await h.visit(venue);
  assert.equal(venueRecovered.status,200);
  assert.match(await venueRecovered.text(),/再描画/);
});

test("concurrent cold visitors in one isolate get a checked page with one artist render", async () => {
  const h = harness();
  let entered!: () => void, finish!: () => void;
  const started = new Promise<void>(resolve=>{entered=resolve;});
  const gate = new Promise<void>(resolve=>{finish=resolve;});
  h.services.render = async req=>{ h.renderRequests.push(req); entered(); await gate; return makeResponse(artist,"現在の公演一覧"); };
  const first=h.visit(artist);
  await started;
  const concurrent=await Promise.all(Array.from({length:12},()=>h.visit(artist)));
  assert.ok(concurrent.every(response=>response.status===200 && response.headers.get("X-Tixrepo-Page-Cache")==="BUSY"));
  assert.equal(h.renderRequests.length,1);
  finish();await first;
  assert.equal((await h.visit(artist)).headers.get("X-Tixrepo-Page-Cache"),"HIT");
});

test("verified immutable assets stream without a second full read; runtime SSR cannot mark itself trusted", async () => {
  const h = harness();
  h.services.assets.fetch = async () => {
    const response = makeResponse(venue,"保存済み");
    response.headers.set("X-Tixrepo-Prepared-Page","validated");
    response.text = async () => { throw new Error("the asset should stream"); };
    return response;
  };
  const streamed = await h.visit(venue);
  assert.equal(streamed.status,200);
  assert.equal(streamed.headers.has("X-Tixrepo-Prepared-Page"),false);
  assert.match(await streamed.text(),/保存済み/);
  h.services.render = async () => new Response("incomplete", { headers:{
    "Content-Type":"text/html", "X-Tixrepo-Prepared-Page":"validated",
  }});
  h.services.assets.fetch = async () => new Response(null,{status:404});
  assert.equal((await h.visit(artist)).status,503);
});

test("venue HTML refreshes after a real venue change on the same day or at the JST boundary", async context => {
  const before = new Date("2026-11-17T14:59:59.000Z");
  context.mock.timers.enable({ apis: ["Date"], now:before });
  const h = harness();
  let latest = "2026-11-15T13:00:00.000Z";
  const services = { ...h.services, venueLastChange:async () => latest };
  const assetFetch = services.assets.fetch;
  services.assets = {fetch:async req => {
    const res = await assetFetch(req);
    res.headers.set("X-Tixrepo-Prepared-At","2026-11-17T14:48:00.000Z");
    return res;
  }};
  const visit = () => servePublicGuidePage(new Request(origin+venue),services);
  assert.equal((await visit()).headers.get("X-Tixrepo-Page-Delivery"),"static-html");
  h.advance(GUIDE_HTML_TTL);
  latest = "2026-11-17T14:50:00.000Z";
  assert.equal((await visit()).headers.get("X-Tixrepo-Page-Delivery"),"ssr-html");
  latest = "2026-11-15T13:00:00.000Z";
  context.mock.timers.setTime(before.getTime()+1_000);
  const midnight = await visit();
  assert.equal(midnight.headers.get("X-Tixrepo-Page-Cache"),"MISS");
  assert.equal(midnight.headers.get("X-Tixrepo-Page-Delivery"),"ssr-html");
});

test("an SSR that never finishes yields a valid fallback at the deadline", async context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  let entered!: () => void, aborted = false;
  const started = new Promise<void>(done => { entered = done; });
  h.services.render = req => new Promise((_done, fail) => {
    req.signal.addEventListener("abort", () => { aborted = true; fail(new Error("timed out")); });
    entered();
  });
  const response = h.visit(artist);
  await started;
  context.mock.timers.tick(7_000);
  assert.equal((await response).headers.get("X-Tixrepo-Page-Cache"),"FALLBACK");
  assert.equal(aborted,true);
});

