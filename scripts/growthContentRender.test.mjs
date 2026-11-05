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

test("artist seat guides expose actual venue and date links in initial HTML, including disclosures", async () => {
  const { default: Guide } = await import("../src/components/seo/ArtistSeatSearchGuide.tsx");
  const venueIds = ["tokyo-dome", "sapporo-dome", "kyocera-dome", "k-arena"];
  const events = venueIds.flatMap((venue_id, index) => Array.from({ length: 4 }, (_, dateIndex) => ({
    ...event, id: `guide-${index}-${dateIndex}`, title: "Snow Man DOME TOUR", artist_slug: "snow-man", venue_id,
    date: `2026-12-${String(dateIndex + 1).padStart(2, "0")}`,
  })));
  const html = render(Guide, { slug: "snow-man", events });
  assert.match(html, /Snow Man/);
  assert.match(html, /席・座席表を会場から探す/);
  assert.match(html, /<details>/);
  for (const id of venueIds) assert.ok(html.includes(`href="/venues/${id}#venue-seat-guide"`));
  for (const row of events) assert.ok(html.includes(`href="/events/${row.id}"`));
  assert.equal(html.includes("/venues/belluna-dome"), false);
});

test("empty artist records do not create fictitious venue links or claim seat reports exist", async () => {
  const { default: Guide } = await import("../src/components/seo/ArtistSeatSearchGuide.tsx");
  assert.equal(render(Guide, { slug: "snow-man", events: [] }), "");
});

test("artist seat action without a published guide leads to the real venue directory", async () => {
  const { default: Hub } = await import("../src/components/artist-page/ArtistActionHub.tsx");
  for (const seatHref of [undefined, null]) {
    const html = render(Hub, { artistName: "EXO", slug: "exo", seatHref });
    assert.match(html, /href="\/venues" aria-label="EXOの座席表"/);
    assert.match(html, /会場から探す/);
    assert.doesNotMatch(html, /#seat-map/);
  }
  const html = render(Hub, { artistName: "INI", slug: "ini", seatHref: "#artist-seat-guide", seatDescription: "会場・公演日から探す" });
  assert.match(html, /href="#artist-seat-guide" aria-label="INIの座席表"/);
});

test("performance seat links use exact official venue names and hide unverified destinations", async () => {
  const { default: Links } = await import("../src/components/seo/PerformanceSeatLinks.tsx");
  for (const [venue, id] of [["クロコくんホール", "gaishi-hall"], ["KYOCERA DOME OSAKA", "kyocera-dome"]]) {
    const html = render(Links, { event: { ...event, venue_id: "official-feed", venue } });
    assert.ok(html.includes(`href="/venues/${id}#venue-seat-guide"`));
    assert.match(html, /会場の常設座席表を見る/);
    assert.doesNotMatch(html, /主催者の公演シートマップ/);
  }
  assert.equal(render(Links, { event: { ...event, venue_id: "unknown", venue: "未掲載の会場XYZ" } }), "");
});

test("official external charts render as working links and distinguish venue layouts from performance charts", async () => {
  const { default: Links } = await import("../src/components/seo/PerformanceSeatLinks.tsx");
  const { OFFICIAL_SEAT_SOURCES } = await import("../src/lib/officialSeatSources.ts");
  const source = OFFICIAL_SEAT_SOURCES.find(source => source.id === "mrs-shadows-kagawa");
  const record = source.events[0];
  const html = render(Links, { event: { ...event, id:record.id, date:record.date, artist_slug:record.artistSlug, venue:record.venue, venue_id:"official-news" } });
  assert.match(html, /主催者の公演座席表を見る/);
  assert.match(html, /会場公式の座席表を見る/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /公演ごとの配置と異なる場合があります/);
  assert.doesNotMatch(html, /主催者ページの「SEAT MAP」/);
  const layout = OFFICIAL_SEAT_SOURCES.find(source => source.kind === "layout");
  const layoutHtml = render(Links, { event:{ ...event, venue_id:"unknown", venue:layout.names[0] } });
  assert.match(layoutHtml, /客席レイアウト例/);
  assert.doesNotMatch(layoutHtml, /主催者の公演座席表/);
  const floor = OFFICIAL_SEAT_SOURCES.find(source => source.kind === "venue-floor");
  const floorHtml = render(Links, { event:{ ...event, venue_id:"unknown", venue:floor.names[0] } });
  assert.match(floorHtml, /会場公式のフロアマップを見る/);
  assert.match(floorHtml, /公演当日の座席番号・配置はチケットや主催者の案内をご確認ください/);
  assert.doesNotMatch(floorHtml, /会場公式の座席表を見る/);
});

test("official attendance guidance has its own heading and is never labelled a seat chart", async () => {
  const { default: Links } = await import("../src/components/seo/PerformanceSeatLinks.tsx");
  const { OFFICIAL_SEAT_SOURCES } = await import("../src/lib/officialSeatSources.ts");
  const sources = OFFICIAL_SEAT_SOURCES.filter(source => source.kind === "event-guidance");
  assert.equal(sources.reduce((count, source) => count + source.events.length, 0), 31);
  for (const source of sources) for (const record of source.events) {
    const html = render(Links, { event:{ ...event, venue_id:"unknown", id:record.id, date:record.date, venue:record.venue, artist_slug:record.artistSlug } });
    assert.match(html, /公式の会場案内・入場方法/);
    assert.ok(html.includes(`href="${source.url.replaceAll("&", "&amp;")}"`));
    assert.match(html, /会場・入場方法の公式案内を見る/);
    assert.doesNotMatch(html, /座席表を探す|主催者の公演座席表|会場公式の座席表/);
  }
});

test("same-day sessions remain distinguishable in artist guide text", async () => {
  const { default: Guide } = await import("../src/components/seo/ArtistSeatSearchGuide.tsx");
  const html = render(Guide, { slug: "snow-man", events: [
    { ...event, id: "matinee", title: "Snow Man DOME TOUR 昼公演", artist_slug: "snow-man", venue_id: "tokyo-dome" },
    { ...event, id: "evening", title: "Snow Man DOME TOUR 夜公演", artist_slug: "snow-man", venue_id: "tokyo-dome" },
  ] });
  assert.match(html, />2026\/10\/01.*?（Snow Man DOME TOUR 昼公演）/s);
  assert.match(html, />2026\/10\/01.*?（Snow Man DOME TOUR 夜公演）/s);
  assert.match(html, /href="\/events\/matinee"/);
  assert.match(html, /href="\/events\/evening"/);
});

test("curated artist guides also retain other recorded performances without repeating covered dates", async () => {
  const { default: Guide } = await import("../src/components/seo/ArtistSeatSearchGuide.tsx");
  const html = render(Guide, { slug: "number-i", events: [
    { ...event, id: "covered", title: "Number_i LIVE TOUR No.Ⅲ", date: "2026-12-02", venue_id: "kyocera-dome" },
    { ...event, id: "another-tour", title: "Number_i LIVE TOUR No.I", date: "2025-12-01", venue_id: "k-arena" },
  ] });
  assert.match(html, /ほかの公演の会場・座席表を見る/);
  assert.ok(html.includes('href="/venues/k-arena#venue-seat-guide"'));
  assert.ok(html.includes('href="/events/another-tour"'));
  assert.equal(html.split('href="/events/covered"').length - 1, 1);
});
