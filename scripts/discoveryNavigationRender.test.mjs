import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(import.meta.dirname, "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/client") return { url: "test:db", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "test:navigation", shortCircuit: true };
    if (["next/link", "next/image", "next/dynamic"].includes(specifier)) return { url: `test:${specifier}`, shortCircuit: true };
    const target = specifier.startsWith("@/") ? pathToFileURL(path.join(root, "src", specifier.slice(2))).href : specifier;
    if ((target.startsWith(".") || target.startsWith("file:")) && !path.extname(target)) {
      const base = new URL(target, context.parentURL);
      for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(fileURLToPath(base) + ext)) return nextResolve(base.href + ext, context);
    }
    return nextResolve(target, context);
  },
  load(url, context, nextLoad) {
    if (url === "test:db") return { format: "module", shortCircuit: true, source: 'export const supabase={from(){throw new Error("Unexpected browser DB read during SSR")}};export const anonymousSupabase=supabase;' };
    if (url === "test:navigation") return { format: "module", shortCircuit: true, source: 'export const useRouter=()=>({prefetch(){},push(){},back(){}});export const usePathname=()=>"/artists/number-i";export const useSearchParams=()=>new URLSearchParams();' };
    if (url.startsWith("test:next/")) {
      const actual = pathToFileURL(path.join(root, "node_modules", url.slice(5) + ".js")).href;
      return { format: "module", shortCircuit: true, source: `import value from ${JSON.stringify(actual)}; export default value.default ?? value;` };
    }
    if (url.endsWith(".css")) return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_, key) => String(key) });" };
    if (url.endsWith(".json")) return { format: "module", shortCircuit: true, source: `export default ${readFileSync(new URL(url), "utf8")}` };
    if (/\.tsx?$/.test(url)) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText };
    return nextLoad(url, context);
  },
});

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

const { default: Directory } = await import("../src/components/home/HomeVenueDirectory.tsx");
const { VenueProgramList, VenueProgramJump } = await import("../src/components/venue/VenueProgramLinks.tsx");
const { VENUE_REGION_GROUPS } = await import("../src/lib/venueRegions.ts");
const { getPublicVenueSeatGuideHref } = await import("../src/lib/publicVenueGuides.ts");
const regions = VENUE_REGION_GROUPS.map(({ id, label }) => ({ id, label }));
const venues = VENUE_REGION_GROUPS.flatMap(group => group.venueIds.map(id => ({ id, name: id, region: group.id, href: getPublicVenueSeatGuideHref(id) })));
const event = { id: "show-1", date: "2026-12-01", title: "Number_i LIVE TOUR", venue: "東京ドーム", artist_slug: "number-i" };

test("home shortcuts lead directly to six existing seat guides; all 26 remain discoverable", () => {
  const shortcuts = render(Directory, { regions, venues, featured: true });
  const links = [...shortcuts.matchAll(/href="(\/venues\/[^\"]+)"/g)].map(match => match[1]);
  assert.deepEqual(links, ["tokyo-dome", "kyocera-dome", "belluna-dome", "k-arena", "osaka-jo-hall", "makuhari-messe"].map(getPublicVenueSeatGuideHref));
  const full = render(Directory, { regions, venues });
  assert.equal(venues.length, 26);
  for (const venue of venues) assert.ok(full.includes(`href="${venue.href}"`));
  const ids = [...(shortcuts + full).matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.doesNotMatch(shortcuts, /<button|人気ランキング/);
  assert.match(full, /aria-controls="home-venues-links"/);
});

test("each performance has separate event and resolved artist links, even inside the closed disclosure", () => {
  const events = Array.from({ length: 5 }, (_, i) => ({ ...event, id: `show-${i}`, date: `2026-12-0${i + 1}` }));
  const html = render(VenueProgramList, { venueId: "tokyo-dome", events, emptyText: "empty", initialCount: 3 });
  for (const row of events) assert.ok(html.includes(`href="/events/${row.id}"`));
  assert.equal([...html.matchAll(/href="\/artists\/number-i"/g)].length, 5);
  assert.match(html, /Number_i/); assert.match(html, /LIVE TOUR/);
  assert.match(html, /<details/); assert.match(html, /残り2公演を見る/);
  let depth = 0;
  for (const tag of html.matchAll(/<\/?a(?:\s[^>]*|)>/g)) {
    if (tag[0].startsWith("</")) depth--; else { depth++; assert.equal(depth, 1, "No nested anchors"); }
  }
  assert.equal(depth, 0);
});

test("unknown artist keeps the original performance and never invents an artist destination", () => {
  const html = render(VenueProgramList, { venueId: "tokyo-dome", events: [{ ...event, title: "公演名未照合XYZ", artist_slug: null, date: null }], emptyText: "empty" });
  assert.match(html, /公演名未照合XYZ/); assert.match(html, /日程未定/);
  assert.match(html, /href="\/events\/show-1"/); assert.doesNotMatch(html, /href="\/artists\//);
});

test("jump chooses an existing section and disappears when there is no program", () => {
  assert.match(render(VenueProgramJump, { venueId: "tokyo-dome", upcomingCount: 1, pastCount: 2 }), /href="#upcoming-events-title"/);
  assert.match(render(VenueProgramJump, { venueId: "tokyo-dome", upcomingCount: 0, pastCount: 2 }), /href="#past-events-title"/);
  assert.equal(render(VenueProgramJump, { venueId: "tokyo-dome", upcomingCount: 0, pastCount: 0 }), "");
  const empty = render(VenueProgramList, { venueId: "tokyo-dome", events: [], emptyText: "登録予定なし" });
  assert.match(empty, /登録予定なし/); assert.doesNotMatch(empty, /<a\b/);
});

test("long and escaped titles survive initial HTML without becoming markup or guessed relations", () => {
  const title = "確認用長い公演名".repeat(14) + "<script>alert(1)</script>";
  const html = render(VenueProgramList, { venueId: "tokyo-dome", events: [{ ...event, title, artist_slug: null }], emptyText: "empty" });
  assert.match(html, /確認用長い公演名/); assert.doesNotMatch(html, /<script>|truncate/);
  assert.match(html, /&lt;script&gt;/);
});

test("hero exposes both search entrances as ordinary links before hydration", async () => {
  const { default: Hero } = await import("../src/components/home/HeroBanner.tsx");
  const html = render(Hero, {});
  assert.match(html, /href="\/search"/); assert.match(html, /href="\/venues"/);
  assert.match(html, /会場・座席表から探す/); assert.match(html, /アーティストから探す/);
});

test("discovery measurement permits identifiers only and navigation works without analytics", async () => {
  const { discoveryClickParams } = await import("../src/lib/discoveryNavigation.ts");
  const context = { source: "venue_artist", destination: "artist", destinationId: "number-i", venueId: "tokyo-dome" };
  assert.deepEqual(discoveryClickParams(context), { link_source: "venue_artist", destination_type: "artist", destination_id: "number-i", venue_id: "tokyo-dome" });
  for (const destinationId of ["", "mail@example.com", "slug?query=private", "氏名", "../private"]) assert.equal(discoveryClickParams({ ...context, destinationId }), null);
  assert.equal(discoveryClickParams({ ...context, source: "free text" }), null);
  assert.equal(discoveryClickParams({ ...context, venueId: "private?query=1" }), null);
  const { default: Link } = await import("../src/components/common/DiscoveryLink.tsx");
  const element = Link({ href: "/artists/number-i", discovery: context, children: "artist" });
  assert.equal(element.props.href, "/artists/number-i");
  assert.doesNotThrow(() => element.props.onClick());
});
