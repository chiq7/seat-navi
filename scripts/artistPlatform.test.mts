import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ARTISTS,
  assignArtistSlug,
  type Artist,
} from "@/lib/artists";
import { ARTIST_SEARCH_ALIASES } from "@/lib/artistSearchAliases";
import {
  buildArtistPageData,
  buildArtistPageData as buildPage,
  DEFAULT_ARTIST_HERO_IMAGE,
  getJstDateString,
  resolveArtistHeroImage,
  selectNextEvent,
  selectPredictionEventId,
} from "@/lib/artistPageData";
import { parseEventTitle } from "@/lib/eventTitle";
import { toEventRows } from "@/lib/eventCrawler";
import type { CrawledEvent, OfficialNews } from "@/lib/types";
import { OFFICIAL_NEWS_AUDIT_COUNTS } from "@/lib/officialNewsRegistry";
import { LEGACY_SOURCES } from "./officialNews/legacySites";
import { SITE_CONFIGS, toSiteConfig } from "./officialNews/sites/index";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

loadEnvLocal();
const { buildOfficialNewsCollections, getOfficialNewsSummary } = await import("@/lib/officialNews");
const {
  rankEventSearchResults,
  searchArtists,
  shouldSearchEventText,
} = await import("@/lib/search");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fixtureArtist = (overrides: Partial<Artist> = {}): Artist => ({
  slug: "fixture-artist",
  name: "Fixture Artist",
  genre: "other",
  description: "fixture",
  keywords: ["FIXTURE"],
  initials: "FA",
  grad: "from-gray-300 to-gray-500",
  accentColor: "#000000",
  accentDark: "#111111",
  ...overrides,
});

const fixtureEvent = (overrides: Partial<CrawledEvent> = {}): CrawledEvent => ({
  id: "event-1",
  title: "Fixture Artist TOUR",
  venue: "Fixture Arena",
  venue_id: "fixture-arena",
  date: "2026-07-24",
  genre: "other",
  artist_slug: "fixture-artist",
  artist_match_source: "explicit",
  ...overrides,
});

test("search supports partial artist names while keeping short acronym boundaries", () => {
  assert.equal(searchArtists("Nizi")[0]?.slug, "niziu");
  assert.equal(searchArtists("ｎｉｚｉ")[0]?.slug, "niziu");
  assert.equal(searchArtists("にじゅー")[0]?.slug, "niziu");
  assert.equal(searchArtists("ニジュー")[0]?.slug, "niziu");
  assert.equal(searchArtists("IVE")[0]?.slug, "ive");
  assert.equal(searchArtists("に")[0]?.slug, "naniwa-danshi");
  assert.equal(searchArtists("に").some((artist) => artist.slug === "niziu"), false);
  assert.equal(shouldSearchEventText("に"), false);
  assert.equal(shouldSearchEventText("Nizi"), true);
});

test("kana readings and common nicknames are available without changing crawler keywords", () => {
  assert.equal(searchArtists("のぎざか")[0]?.slug, "nogizaka46");
  assert.equal(searchArtists("サクラザカ")[0]?.slug, "sakurazaka46");
  assert.equal(searchArtists("みーあい")[0]?.slug, "me-i");
  assert.equal(searchArtists("キンプリ")[0]?.slug, "king-prince");
  assert.equal(searchArtists("ひげだん")[0]?.slug, "officialdism");
  assert.equal(searchArtists("わんおく")[0]?.slug, "one-ok-rock");
});

test("every production artist has a kana search path", () => {
  const kana = /[ぁ-んァ-ヶ]/;
  const missing = ARTISTS
    .filter((artist) => artist.slug !== "test")
    .filter((artist) => ![
      artist.name,
      ...artist.keywords,
      ...(ARTIST_SEARCH_ALIASES[artist.slug] ?? []),
    ].some((value) => kana.test(value)))
    .map((artist) => artist.slug);
  assert.deepEqual(missing, []);
});

test("single-character event search keeps artist events and removes unrelated title noise", () => {
  const naniwa = ARTISTS.find((artist) => artist.slug === "naniwa-danshi");
  assert.ok(naniwa);
  const ranked = rankEventSearchResults("に", [
    fixtureEvent({ id: "naniwa", title: "ARENA TOUR", artist_slug: "naniwa-danshi" }),
    fixtureEvent({ id: "noise", title: "母に感謝のコンサート", artist_slug: "other" }),
  ], [naniwa]);
  assert.deepEqual(ranked.map((event) => event.id), ["naniwa"]);
});

test("artist fixture produces page data and hero image fallbacks", () => {
  const event = fixtureEvent();
  const page = buildArtistPageData(
    fixtureArtist(),
    [event],
    new Date("2026-07-23T03:00:00Z"),
  );
  assert.equal(page.artistSlug, "fixture-artist");
  assert.equal(page.nextEvent?.id, event.id);
  assert.deepEqual(page.upcoming.map((item) => item.id), [event.id]);
  assert.equal(page.heroImage, DEFAULT_ARTIST_HERO_IMAGE);
  assert.equal(resolveArtistHeroImage("/images/artists/fixture.jpg"), "/images/artists/fixture.jpg");
  assert.equal(
    buildPage(fixtureArtist({ heroImage: "/images/artists/fixture.jpg" }), [], new Date()).heroImage,
    "/images/artists/fixture.jpg",
  );
});

test("JST boundary and deterministic same-day hero selection", () => {
  assert.equal(getJstDateString(new Date("2026-07-22T14:59:59Z")), "2026-07-22");
  assert.equal(getJstDateString(new Date("2026-07-22T15:00:00Z")), "2026-07-23");

  const keyword = fixtureEvent({ id: "a-keyword", artist_slug: null, artist_match_source: "keyword" });
  const explicit = fixtureEvent({ id: "z-explicit", venue: "Other Arena" });
  assert.equal(selectNextEvent([keyword, explicit], "2026-07-23")?.id, "z-explicit");
  assert.equal(selectNextEvent([explicit, keyword], "2026-07-23")?.id, "z-explicit");
});

test("two concurrent tours keep each event tuple intact and never mix past with future", () => {
  const past = fixtureEvent({
    id: "past-tour",
    title: "Fixture Artist PAST TOUR",
    venue: "Past Hall",
    date: "2026-07-22",
  });
  const keywordTour = fixtureEvent({
    id: "a-keyword-tour",
    title: "Fixture Artist TOUR BETA",
    venue: "A Arena",
    date: "2026-07-24",
    artist_slug: null,
    artist_match_source: "keyword",
  });
  const explicitTour = fixtureEvent({
    id: "z-explicit-tour",
    title: "Fixture Artist TOUR ALPHA",
    venue: "Z Arena",
    date: "2026-07-24",
  });
  const laterTour = fixtureEvent({
    id: "later-tour",
    title: "Fixture Artist TOUR BETA FINAL",
    venue: "Final Dome",
    date: "2026-07-25",
  });

  const page = buildArtistPageData(
    fixtureArtist(),
    [past, keywordTour, laterTour, explicitTour],
    new Date("2026-07-23T03:00:00Z"),
  );
  assert.deepEqual(page.nextEvent, explicitTour);
  assert.deepEqual(
    page.upcoming.map(({ id, title, date, venue }) => ({ id, title, date, venue })),
    [explicitTour, keywordTour, laterTour].map(({ id, title, date, venue }) => ({
      id,
      title,
      date,
      venue,
    })),
  );
  assert.deepEqual(page.past.map((event) => event.id), [past.id]);
  assert.equal(
    selectNextEvent([laterTour, explicitTour, keywordTour, past], page.today)?.id,
    explicitTour.id,
  );
  assert.equal(parseEventTitle(page.nextEvent!.title, "Fixture Artist").tourName, "TOUR ALPHA");
});

test("event titles remove only a leading artist after an optional year", () => {
  assert.equal(
    parseEventTitle('2026 ME:I 2ND ARENA LIVE TOUR "ME:I WAY"', "ME:I").tourName,
    '2026 2ND ARENA LIVE TOUR "ME:I WAY"',
  );
  assert.equal(parseEventTitle("ME:I", "ME:I").tourName, "ME:I");
  assert.equal(parseEventTitle("SPECIAL ME:I LIVE", "ME:I").tourName, "SPECIAL ME:I LIVE");
  const testData = parseEventTitle("2026 ME:I 【テストデータ】 TOUR", "ME:I");
  assert.equal(testData.isTestData, true);
  assert.equal(testData.tourName, "2026 TOUR");
});

test("artist matching preserves explicit slug, fills unique matches, and rejects ambiguity", () => {
  const alpha = fixtureArtist({ slug: "alpha", name: "ALPHA", keywords: ["ALPHA", "SHARED"] });
  const beta = fixtureArtist({ slug: "beta", name: "BETA", keywords: ["BETA", "SHARED"] });

  const explicit = assignArtistSlug({ title: "BETA LIVE", artist_slug: "alpha" }, [alpha, beta]);
  assert.equal(explicit.event.artist_slug, "alpha");
  assert.equal(explicit.match.status, "explicit");

  const unique = assignArtistSlug({ title: "ALPHA LIVE", artist_slug: null }, [alpha, beta]);
  assert.equal(unique.event.artist_slug, "alpha");
  assert.equal(unique.match.status, "matched");

  const ambiguous = assignArtistSlug({ title: "SHARED LIVE", artist_slug: null }, [alpha, beta]);
  assert.equal(ambiguous.event.artist_slug, null);
  assert.equal(ambiguous.match.status, "ambiguous");
  assert.deepEqual(ambiguous.match.candidateSlugs, ["alpha", "beta"]);
});

test("crawler rows persist only unique artist matches and report unresolved titles", () => {
  const alpha = fixtureArtist({ slug: "alpha", name: "ALPHA", keywords: ["ALPHA", "SHARED"] });
  const beta = fixtureArtist({ slug: "beta", name: "BETA", keywords: ["BETA", "SHARED"] });
  const converted = toEventRows(
    [
      { title: "ALPHA LIVE", date: "2026-08-01", genre: "other" },
      { title: "SHARED LIVE", date: "2026-08-02", genre: "other" },
      { title: "UNKNOWN LIVE", date: "2026-08-03", genre: "kpop" },
    ],
    { id: "fixture-arena", name: "Fixture Arena" },
    null,
    null,
    new Date("2026-07-23T00:00:00Z"),
    "https://example.com/schedule",
    [alpha, beta],
  );
  assert.equal(converted.rows[0].artist_slug, "alpha");
  assert.equal(converted.rows[1].artist_slug, null);
  assert.equal(converted.rows[2].artist_slug, null);
  assert.deepEqual(converted.artistAssociations.map((item) => item.status), ["matched", "ambiguous", "none"]);
});

test("prediction target uses selected, next, then latest past event", () => {
  const old = fixtureEvent({ id: "old", date: "2026-01-01" });
  const latestPast = fixtureEvent({ id: "latest-past", date: "2026-07-22" });
  const next = fixtureEvent({ id: "next", date: "2026-07-24" });
  assert.equal(selectPredictionEventId([old, latestPast, next], "2026-07-23", "old"), "old");
  assert.equal(selectPredictionEventId([old, latestPast, next], "2026-07-23", null), "next");
  assert.equal(selectPredictionEventId([old, latestPast], "2026-07-23", null), "latest-past");
});

test("one classified NEWS item feeds both TOP and list without replacing its title", () => {
  const item: OfficialNews = {
    id: "news-1",
    artist_slug: "fixture-artist",
    article_title: "公式発表タイトル",
    article_url: "https://example.com/news/1",
    published_date: "2026-07-23",
    thumbnail_url: null,
    category: "live",
    is_event_candidate: true,
    event_name: "Fixture Live",
    tour_name: null,
    event_dates: ["2026-08-01"],
    venue_names: ["Fixture Arena"],
    ticket_sale_start: null,
    ticket_sale_end: null,
    confidence: "high",
    needs_review: false,
    review_reason: null,
    fetched_at: "2026-07-23T00:00:00Z",
    created_at: "2026-07-23T00:00:00Z",
  };
  const collections = buildOfficialNewsCollections([item]);
  assert.equal(collections.top[0].article_title, "公式発表タイトル");
  assert.equal(collections.all[0].article_title, "公式発表タイトル");
  assert.match(getOfficialNewsSummary(item), /Fixture Live/);
});

test("existing 13 NEWS configs remain intact with 12 enabled sites", () => {
  const expected = new Map([
    ["exo", ["https://exo-jp.net/news/index.php", "exo"]],
    ["generations", ["https://www.generations-ldh.com/sys_inc/newsdat.php?p=0&y=", "generations"]],
    ["fruits-zipper", ["https://fruitszipper.asobisystem.com/news/1/", "asobisystem"]],
    ["jo1", ["https://jo1.jp/news/list/1/3/", "lapone"]],
    ["shigure-ui", ["https://www.universal-music.co.jp/shigureui/wp-json/wp/v2/posts?per_page=20", "universal-music-wp"]],
    ["ado", ["https://www.universal-music.co.jp/ado/wp-json/wp/v2/posts?per_page=20", "universal-music-wp"]],
    ["be-first", ["https://befirst.tokyo/news/", "befirst"]],
    ["fujii-kaze", ["https://fujiikaze.com/wp-json/wp/v2/posts?per_page=20", "fujiikaze"]],
    ["cutie-street", ["https://cutiestreet.asobisystem.com/news/1", "asobisystem"]],
    ["candy-tune", ["https://candytune.asobisystem.com/news/1", "asobisystem"]],
    ["me-i", ["https://me-i.jp/news/1", "lapone"]],
    ["ini", ["https://ini-official.com/news/1", "lapone"]],
    ["zerobaseone", ["https://zerobaseone.jp/news/list/1/3/", "lapone"]],
  ]);
  const legacySiteConfigs = SITE_CONFIGS.filter((site) => site.strategy === "special");
  assert.equal(LEGACY_SOURCES.length, 13);
  assert.equal(legacySiteConfigs.length, 13);
  for (const source of LEGACY_SOURCES) {
    assert.deepEqual([source.newsUrl, source.parserGroup], expected.get(source.artistSlug));
    assert.equal(source.enabled, source.artistSlug !== "be-first");
    assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === source.artistSlug)?.strategy, "special");
  }
  assert.equal(legacySiteConfigs.filter((site) => site.enabled).length, 12);

  assert.equal(ARTISTS.length, 96);
  assert.equal(new Set(ARTISTS.map((artist) => artist.slug)).size, ARTISTS.length);
  const digest = crypto.createHash("sha256").update(ARTISTS.map((artist) => artist.slug).join("\n")).digest("hex");
  assert.equal(digest, "5308bc07818a827b03178ca4166e5a907eeb49f26fe3d560f2c9ecb51d923a60");
});

test("all audited NEWS configs keep only verified sites enabled", () => {
  const expected = new Map([
    ["one-ok-rock", "rss"],
    ["aimyon", "static_html"],
    ["back-number", "static_html"],
    ["mrs-green-apple", "static_html"],
  ]);
  for (const [slug, strategy] of expected) {
    const site = SITE_CONFIGS.find((candidate) => candidate.artistSlug === slug);
    assert.equal(site?.strategy, strategy);
    assert.equal(site?.verificationStatus, "verified");
    assert.equal(site?.enabled, true);
  }

  const niziu = SITE_CONFIGS.find((site) => site.artistSlug === "niziu");
  assert.equal(niziu?.strategy, "json_api");
  assert.equal(niziu?.verificationStatus, "verified");
  assert.equal(niziu?.enabled, true);
  assert.deepEqual(OFFICIAL_NEWS_AUDIT_COUNTS, {
    total: 75,
    verified: 62,
    unavailable: 1,
    needsDedicatedParser: 12,
  });
  assert.equal(SITE_CONFIGS.length, 93);
  assert.equal(SITE_CONFIGS.filter((site) => site.enabled).length, 79);
  assert.equal(SITE_CONFIGS.filter((site) => site.strategy === "auto_html").length, 56);
  assert.equal(SITE_CONFIGS.filter((site) => site.verificationStatus === "rejected").length, 0);
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "seventeen")?.strategy, "static_html");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "doh-kyung-soo-d-o")?.strategy, "rss");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "ive")?.strategy, "static_html");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "timelesz")?.strategy, "wordpress");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "mazzel")?.strategy, "rss");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "domoto")?.strategy, "json_api");
});

test("a new common NEWS site is generated from the artist definition without special routing", () => {
  const site = toSiteConfig(fixtureArtist({
    officialNews: {
      newsUrl: "https://example.com/news/",
      strategy: "rss",
      rssUrl: "https://example.com/feed.xml",
      verificationStatus: "verified",
      enabled: true,
      notes: "fixture",
    },
  }));
  assert.equal(site?.artistSlug, "fixture-artist");
  assert.equal(site?.strategy, "rss");
  assert.equal(site?.rssUrl, "https://example.com/feed.xml");
  assert.equal(site?.specialParserName, undefined);
});

test("TOP empty states remain present without a setlist section", () => {
  const files = [
    "src/components/artist-page/SeatReportTimelineSection.tsx",
    "src/components/artist-page/ReportSection.tsx",
    "src/components/artist-page/SeatPredictionPreviewSection.tsx",
    "src/app/artists/[slug]/ArtistClient.tsx",
  ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");
  assert.match(files, /まだ座席報告はありません/);
  assert.match(files, /現地レポはまだありません/);
  assert.match(files, /現地レポタイムライン/);
  assert.match(files, /最初の現地レポを投稿する/);
  assert.match(files, /seat-map-preparing2\.png/);
  assert.match(files, /topPrediction \?/);

  const artistClient = fs.readFileSync(
    path.join(projectRoot, "src/app/artists/[slug]/ArtistClient.tsx"),
    "utf8",
  );
  assert.doesNotMatch(artistClient, /Setlist(?:EmptyState|Summary)Section/);
  assert.match(artistClient, /OfficialNewsSection[\s\S]*BottomNav/);
  assert.match(artistClient, /: "\/report\/ticket"/);
  assert.match(artistClient, /: "\/report\/live"/);
});

test("configured hero image has a runtime missing-file fallback", () => {
  const hero = fs.readFileSync(
    path.join(projectRoot, "src/components/artist-page/HeroSection.tsx"),
    "utf8",
  );
  assert.match(hero, /onError=/);
  assert.match(hero, /DEFAULT_ARTIST_HERO_IMAGE/);
});
