import test from "node:test";
import assert from "node:assert/strict";
import { servePublicGuidePage } from "../src/lib/workerPublicGuidePage.ts";
import { getJstDateString } from "../src/lib/artistPageData.ts";

test("home cache rolls at midnight in Japan and cannot fall back to yesterday's program", async t => {
  const before = new Date("2026-11-17T14:59:59.500Z");
  const after = new Date("2026-11-17T15:00:00.000Z");
  t.mock.timers.enable({ apis: ["Date"], now: before });
  const request = new Request("https://tixrepo.com/");
  const cache = new Map<string, Response>();
  let renderAvailable = true;
  const page = (day: string) => '<html><head><link rel="canonical" href="https://tixrepo.com"></head><body data-home-program-day="' + day + '"><section id="upcoming-events"></section></body></html>';
  const services = {
    hasSession: false, release: "verified-build",
    assets: {fetch: async () => new Response(page("2026-11-17"), {headers: {"Content-Type":"text/html","X-Tixrepo-Prepared-At":before.toISOString(),"X-Tixrepo-Prepared-Page":"validated"}})},
    cache: async () => ({
      match: async (key: RequestInfo | URL) => cache.get(String((key as Request).url))?.clone(),
      put: async (key: RequestInfo | URL, value: Response) => {cache.set(String((key as Request).url),value);},
    }),
    render: async () => renderAvailable ? new Response(page(getJstDateString()), {headers:{"Content-Type":"text/html"}}) : new Response(null, {status:503}),
  };
  const load = () => servePublicGuidePage(request, services);
  assert.match(await (await load()).text(), /2026-11-17/);
  assert.equal((await load()).headers.get("X-Tixrepo-Page-Cache"),"HIT");
  t.mock.timers.setTime(after.getTime());
  renderAvailable = false;
  assert.equal((await load()).status,503);
  renderAvailable = true;
  assert.match(await (await load()).text(), /2026-11-18/);
  assert.equal((await load()).headers.get("X-Tixrepo-Page-Cache"),"HIT");
});
