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
const event = { id: "recorded", date: "2026-10-01", title: "Number_i LIVE TOUR", venue: "東京ドーム", artist_slug: "number-i" };
test("read failures provide a retry and never assert empty content or expose error details", async () => {
  const { default: ErrorView } = await import("../src/app/artists/[slug]/error.tsx");
  const html = render(ErrorView, { error: new Error("private implementation detail"), reset() {} });
  assert.match(html, /情報を読み込めませんでした/); assert.match(html, /もう一度読み込む/);
  assert.doesNotMatch(html, /private implementation detail|0件|まだありません/);
});
test("official article title and link are included in initial HTML", async () => {
  const { default: News } = await import("../src/app/artists/[slug]/news/ArtistNewsClient.tsx");
  const html = render(News, { slug: "number-i", initialNews: [{ id: "n", article_title: "公式公演案内（検証）", article_url: "https://example.com/official", category: "live", event_dates: [], venue_names: [] }] });
  assert.match(html, /公式公演案内（検証）/); assert.match(html, /href="https:\/\/example.com\/official"/);
  assert.doesNotMatch(html, /準備中です|0 ARTICLES/);
});
test("report content and its permalink are included before hydration", async () => {
  const { default: Reports } = await import("../src/app/artists/[slug]/after-reports/AfterReportsClient.tsx");
  const html = render(Reports, { slug: "number-i", initial: { events: [event], authors: [], reports: [{ id: "report-one", event_id: event.id, user_id: null, memo: "検証用の座席の見え方", seat_block: "A", seat_row: "1", seat_view_photo_paths: [], created_at: "2026-10-01T00:00:00Z" }] } });
  assert.match(html, /検証用の座席の見え方/); assert.match(html, /reportId=report-one/);
  assert.doesNotMatch(html, /現地レポはまだありません/);
});
test("saved song is present without a browser query or an empty initial editor", async () => {
  const { SetlistClient } = await import("../src/app/artists/[slug]/setlist/SetlistClient.tsx");
  const value = { slug: "number-i" };
  const params = Object.assign(Promise.resolve(value), { status: "fulfilled", value });
  const html = render(SetlistClient, { params, initialEvents: [event], initialSetlist: { eventId: event.id, items: [{ id: "song", type: "song", title: "保存済み検証曲" }] } });
  assert.match(html, /保存済み検証曲/);
  assert.doesNotMatch(html, /この公演のセトリはまだ空です|投稿セットリストを読み込み中です/);
});
test("every upcoming event has an ordinary link even in the closed disclosure", async () => {
  const { default: Upcoming } = await import("../src/components/artist-page/UpcomingEventsSection.tsx");
  const events = Array.from({ length: 6 }, (_, i) => ({ ...event, id: `show-${i}`, date: `2026-12-${String(i + 1).padStart(2, "0")}` }));
  const html = render(Upcoming, { artistName: "Number_i", events });
  for (const row of events) assert.ok(html.includes(`href="/events/${row.id}"`));
  assert.match(html, /<details>/); assert.match(html, /<summary/);
});
test("a selected performance survives the setlist submission link", async () => {
  const { ReportEventSelector } = await import("../src/components/report/ReportEventSelector.tsx");
  const html = render(ReportEventSelector, { selectedEvent: event, artistName: "Number_i", artistSlug: "number-i" });
  assert.match(html, /href="\/artists\/number-i\/setlist\?event=recorded"/);
  assert.match(html, /href="\/report\/ticket\?event=recorded"/);
});
