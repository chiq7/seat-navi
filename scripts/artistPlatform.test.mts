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
  getSearchEventDestination,
  rankEventSearchResults,
  searchArtists,
  searchVenues,
  shouldSearchEventText,
} = await import("@/lib/search");
const {
  buildSupplementalFeedItems,
  dedupeFeedItemsByDetail,
  formatEventPeriod,
  selectProvisionalFeaturedEvents,
  supplementalFeedCount,
} = await import("@/lib/homeData");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("report forms preserve anonymous posting and link signed-in posts to their owner", () => {
  const clientSource = fs.readFileSync(path.join(projectRoot, "src/lib/supabase/client.ts"), "utf8");
  const reportSources = [
    "src/app/report/ticket/page.tsx",
    "src/app/report/live/page.tsx",
    "src/app/events/[id]/fan-seat-prediction/page.tsx",
  ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"));

  assert.match(clientSource, /export async function getPostingContext/);
  assert.match(clientSource, /sessionData\.session/);
  assert.match(clientSource, /userData\.user\.id/);
  for (const source of reportSources) {
    assert.match(source, /getPostingContext\(\)/);
    assert.doesNotMatch(source, /user_id:\s+null/);
  }

  const ticketSource = reportSources[0];
  const mypageSource = fs.readFileSync(path.join(projectRoot, "src/app/mypage/page.tsx"), "utf8");
  assert.match(ticketSource, /const reportId = crypto\.randomUUID\(\)/);
  assert.equal((ticketSource.match(/id:\s+reportId/g) ?? []).length, 2);
  assert.match(mypageSource, /from\("seat_reports"\)[\s\S]*?update\(\{ comment: value \}\)[\s\S]*?eq\("id", id\)/);
  assert.match(mypageSource, /from\("seat_reports"\)[\s\S]*?delete\(\)[\s\S]*?eq\("id", id\)/);
});

test("generic report entry waits for the user to choose a performance", () => {
  const reportEntrySource = fs.readFileSync(
    path.join(projectRoot, "src/app/report/page.tsx"),
    "utf8",
  );
  const eventPickerSource = fs.readFileSync(
    path.join(projectRoot, "src/components/common/EventPicker.tsx"),
    "utf8",
  );

  assert.match(reportEntrySource, /const preselectedEventId = searchParams\.get\("event"\)/);
  assert.match(reportEntrySource, /const preselectedArtistSlug = searchParams\.get\("artist"\)/);
  assert.match(reportEntrySource, /preselectedArtistSlug\) \{\s*list = \(await getEventsForArtist\(preselectedArtistSlug\)\)\.sort/);
  assert.match(reportEntrySource, /\(b\.date \?\? ""\)\.localeCompare\(a\.date \?\? ""\)/);
  assert.match(reportEntrySource, /else if \(!preselectedArtistSlug\)/);
  assert.match(reportEntrySource, /setSelectedId\(initial \?\? null\)/);
  assert.doesNotMatch(reportEntrySource, /initial = list\.find\(\(e\) => e\.artist_slug \?\?/);
  assert.doesNotMatch(reportEntrySource, /initial = list\[0\]\.id/);
  assert.match(
    eventPickerSource,
    /!selectedEventId && <option value="">公演を選択してください<\/option>/,
  );
});

test("report and seat pages share the same compact event summary", () => {
  const reportEntrySource = fs.readFileSync(
    path.join(projectRoot, "src/app/report/page.tsx"),
    "utf8",
  );
  const eventDetailSource = fs.readFileSync(
    path.join(projectRoot, "src/app/events/[id]/EventDetailClient.tsx"),
    "utf8",
  );
  const summarySource = fs.readFileSync(
    path.join(projectRoot, "src/components/common/CompactEventSummary.tsx"),
    "utf8",
  );

  assert.match(reportEntrySource, /<CompactEventSummary/);
  assert.match(eventDetailSource, /<CompactEventSummary/);
  assert.match(summarySource, /py-2\.5/);
  assert.match(summarySource, /text-\[12px\]/);
  assert.match(summarySource, /data-event-summary/);
  assert.doesNotMatch(eventDetailSource, />LIVE DATE</);
  assert.doesNotMatch(eventDetailSource, />VENUE</);
});

test("seat map tabs and report choice buttons use shared UI components", () => {
  const seatTabsSource = fs.readFileSync(
    path.join(projectRoot, "src/components/arena-map/SeatMapColorTabs.tsx"),
    "utf8",
  );
  const mapSources = [
    "src/components/artist-page/MapPreviewSection.tsx",
    "src/app/events/[id]/EventDetailClient.tsx",
  ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"));
  const reportSources = [
    "src/app/report/ticket/page.tsx",
    "src/app/report/live/page.tsx",
  ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"));

  assert.match(seatTabsSource, /grid grid-cols-4/);
  assert.match(seatTabsSource, /min-h-12/);
  assert.match(seatTabsSource, /aria-pressed=\{selected\}/);
  for (const source of mapSources) {
    assert.match(source, /<SeatMapColorTabs/);
    assert.doesNotMatch(source, /const COLOR_TABS/);
  }
  for (const source of reportSources) {
    assert.match(source, /ReportChoiceButton as Btn/);
    assert.doesNotMatch(source, /function Btn\(/);
  }
  const reportChoiceSource = fs.readFileSync(
    path.join(projectRoot, "src/components/report/ReportChoiceButton.tsx"),
    "utf8",
  );
  assert.match(reportChoiceSource, /aria-pressed=\{selected\}/);
  assert.match(reportChoiceSource, /data-report-choice/);
});

test("report and seat pages share the compact event picker section", () => {
  const compactPickerSource = fs.readFileSync(
    path.join(projectRoot, "src/components/common/CompactEventPickerSection.tsx"),
    "utf8",
  );
  const summarySource = fs.readFileSync(
    path.join(projectRoot, "src/components/common/CompactEventSummary.tsx"),
    "utf8",
  );
  const pageSources = [
    "src/app/report/page.tsx",
    "src/app/events/[id]/EventDetailClient.tsx",
  ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"));

  assert.match(compactPickerSource, /data-compact-event-picker/);
  assert.match(compactPickerSource, /text-\[18px\]/);
  assert.match(compactPickerSource, /<EventCarouselPicker/);
  assert.match(summarySource, /grid-cols-\[auto_minmax\(0,1fr\)\]/);
  for (const source of pageSources) {
    assert.match(source, /<CompactEventPickerSection/);
    assert.doesNotMatch(source, /<EventCarouselPicker/);
  }
});

test("fan board X handles and prediction image cleanup keep narrow database rules", () => {
  const fanBoardMigration = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20260803122921_add_fan_board_x_handle.sql"),
    "utf8",
  );
  const predictionStorageMigration = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/20260810022307_authenticated_prediction_image_select.sql"),
    "utf8",
  );

  assert.match(fanBoardMigration, /add column x_handle text/);
  assert.match(fanBoardMigration, /\^\[A-Za-z0-9_\]\{1,15\}\$/);
  assert.match(predictionStorageMigration, /for select\s+to authenticated/);
  assert.match(predictionStorageMigration, /bucket_id = 'fan-seat-predictions'/);
  assert.match(predictionStorageMigration, /owner_id = \(select auth\.uid\(\)::text\)/);
  assert.doesNotMatch(predictionStorageMigration, /using\s*\(\s*true\s*\)/);
});

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

test("venue search recognizes seat-map intent and common venue aliases", () => {
  assert.equal(searchVenues("東京ドーム 座席表")[0]?.id, "tokyo-dome");
  assert.equal(searchVenues("さいたまアリーナ")[0]?.id, "saitama-super-arena");
  assert.equal(searchVenues("名古屋ドームの見え方")[0]?.id, "vantelin-dome");
  assert.equal(searchVenues("横アリ 座席表")[0]?.id, "yokohama-arena");
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

test("combined artist and venue search keeps only the matching performance", () => {
  const yoasobi = ARTISTS.find((artist) => artist.slug === "yoasobi");
  assert.ok(yoasobi);
  const ranked = rankEventSearchResults("YOASOBI 東京ドーム", [
    fixtureEvent({ id: "target", title: "YOASOBI DOME TOUR", venue: "東京ドーム", artist_slug: "yoasobi" }),
    fixtureEvent({ id: "artist-only", title: "YOASOBI ARENA TOUR", venue: "Kアリーナ横浜", artist_slug: "yoasobi" }),
    fixtureEvent({ id: "venue-only", title: "OTHER LIVE", venue: "東京ドーム", artist_slug: "other" }),
  ], [yoasobi]);
  assert.deepEqual(ranked.map((event) => event.id), ["target"]);
});

test("search event cards open the artist hub with a safe event fallback", () => {
  assert.equal(
    getSearchEventDestination(fixtureEvent({ id: "niziu-event", artist_slug: "niziu" })),
    "/artists/niziu",
  );
  assert.equal(
    getSearchEventDestination(fixtureEvent({ id: "unlinked-event", artist_slug: null })),
    "/events/unlinked-event",
  );
  assert.equal(
    getSearchEventDestination(
      fixtureEvent({ id: "combined-event", artist_slug: "yoasobi", venue: "東京ドーム" }),
      "YOASOBI 東京ドーム",
    ),
    "/events/combined-event",
  );
});

test("home featured events use popular artists while preserving nearest-date order", () => {
  const upcoming = [
    { id: "other", artistSlug: "other", artist: "Other", eventName: "OTHER LIVE", date: "7/26", period: "7/26(日)", venue: "A", count: "0" },
    { id: "niziu", artistSlug: "niziu", artist: "NiziU", eventName: "NiziU LIVE", date: "7/27", period: "7/27(月)", venue: "B", count: "0" },
    { id: "snow-man", artistSlug: "snow-man", artist: "Snow Man", eventName: "Snow Man LIVE", date: "7/28", period: "7/28(火)", venue: "C", count: "0" },
    { id: "seventeen", artistSlug: "seventeen", artist: "SEVENTEEN", eventName: "SEVENTEEN LIVE", date: "7/29", period: "7/29(水)", venue: "D", count: "0" },
  ];

  assert.deepEqual(
    selectProvisionalFeaturedEvents(upcoming, 2).map((event) => event.id),
    ["niziu", "snow-man"],
  );
});

test("home event periods use the first and last unique performance dates", () => {
  assert.equal(formatEventPeriod(["2026-08-02", "2026-08-01", "2026-08-02"]), "8/1(土)〜8/2(日)");
  assert.equal(formatEventPeriod([null, "2026-08-01"]), "8/1(土)");
  assert.equal(formatEventPeriod([null]), "日程未定");
});

test("home supplemental feed shrinks as real posts arrive and never enters aggregate data", () => {
  const upcoming = [{
    id: "niziu-tokyo",
    artistSlug: "niziu",
    artist: "NiziU",
    eventName: "NiziU LIVE",
    date: "7/28(火)",
    dateIso: "2026-07-28",
    period: "7/28(火)",
    venue: "東京ドーム",
    count: "0",
  }];

  assert.deepEqual([0, 1, 2, 3, 4, 5].map(supplementalFeedCount), [5, 3, 2, 1, 1, 0]);

  const emptyState = buildSupplementalFeedItems(upcoming, 0, new Date("2026-07-27T12:00:00+09:00"));
  assert.equal(emptyState.length, 5);
  assert.equal(emptyState[0]?.type, "公演情報");
  assert.equal(emptyState[0]?.source, "editorial");
  assert.equal(emptyState[0]?.href, "/report/ticket?event=niziu-tokyo");
  assert.equal(emptyState[2]?.source, "sample");
  assert.equal(emptyState[2]?.type, "当落レポ");
  assert.equal(new Set(emptyState.map((item) => item.detail)).size, emptyState.length);
  assert.deepEqual(
    dedupeFeedItemsByDetail([emptyState[0], { ...emptyState[1], detail: emptyState[0].detail }, emptyState[2]])
      .map((item) => item.id),
    [emptyState[0].id, emptyState[2].id],
  );
  assert.equal(buildSupplementalFeedItems(upcoming, 5).length, 0);
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
    verified: 60,
    unavailable: 1,
    needsDedicatedParser: 14,
  });
  assert.equal(SITE_CONFIGS.length, 93);
  assert.equal(SITE_CONFIGS.filter((site) => site.enabled).length, 77);
  assert.equal(SITE_CONFIGS.filter((site) => site.strategy === "auto_html").length, 57);
  assert.equal(SITE_CONFIGS.filter((site) => site.verificationStatus === "rejected").length, 0);
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "seventeen")?.strategy, "static_html");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "doh-kyung-soo-d-o")?.strategy, "rss");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "ive")?.strategy, "static_html");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "timelesz")?.strategy, "wordpress");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "mazzel")?.strategy, "rss");
  assert.equal(SITE_CONFIGS.find((site) => site.artistSlug === "domoto")?.strategy, "json_api");
  const acees = SITE_CONFIGS.find((site) => site.artistSlug === "acees");
  assert.equal(acees?.newsListUrl, "https://jr-official.starto.jp/s/jr/news/list");
  assert.equal(acees?.enabled, false);
  assert.equal(acees?.verificationStatus, "candidate");
  assert.ok(acees?.articleRules?.includeAny?.includes("ACEes"));
  const fantastics = SITE_CONFIGS.find((site) => site.artistSlug === "fantastics");
  assert.equal(fantastics?.enabled, false);
  assert.equal(fantastics?.verificationStatus, "candidate");

  const niziuHosts = [niziu?.officialUrl, niziu?.jsonApi?.url]
    .filter((url): url is string => !!url)
    .map((url) => new URL(url).hostname);
  assert.deepEqual(niziuHosts, ["niziu.com", "www.sonymusic.co.jp"]);
  assert.match(niziu?.jsonApi?.url ?? "", /\/artist\/niziu\/information\//i);
  assert.match(niziu?.urlRules?.allow?.[0] ?? "", /artist\/niziu\/info/i);
});

test("shared official NEWS domains keep explicit artist-specific routing", () => {
  const hosts = new Map<string, string[]>();
  for (const site of SITE_CONFIGS) {
    const urls = [site.newsListUrl, site.jsonApi?.url, site.wordpressApiUrl, site.rssUrl]
      .filter((url): url is string => !!url);
    for (const host of new Set(urls.map((url) => new URL(url).hostname.replace(/^www\./, "")))) {
      hosts.set(host, [...(hosts.get(host) ?? []), site.artistSlug]);
    }
  }
  const shared = Object.fromEntries(
    [...hosts.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([host, slugs]) => [host, [...slugs].sort()]),
  );
  assert.deepEqual(shared, {
    "helloproject.com": ["beyooooonds", "juice-juice"],
    "hololive.hololivepro.com": ["holox", "momosuzu-nene"],
    "mentrecording.jp": ["kis-my-ft2", "snow-man"],
    "nct-jp.net": ["nct-dream", "nct-wish"],
    "sonymusic.co.jp": ["kento-nakajima", "nexz", "niziu", "yoasobi"],
    "starto.jp": ["arashi", "kat-tun", "news"],
    "universal-music.co.jp": ["ado", "king-prince", "shigure-ui", "travis-japan"],
    "wmg.jp": ["chanmina", "number-i", "uratanuki"],
    "ygex.jp": ["bigbang", "blackpink", "ikon", "treasure"],
  });

  const sonyPaths = new Map([
    ["niziu", /\/artist\/niziu\//i],
    ["nexz", /\/artist\/NEXZ\//],
    ["yoasobi", /\/PR\/YOASOBI\//],
    ["kento-nakajima", /\/artist\/KentoNakajima\//],
  ]);
  for (const [slug, expectedPath] of sonyPaths) {
    const site = SITE_CONFIGS.find((candidate) => candidate.artistSlug === slug);
    const urls = [site?.officialUrl, site?.jsonApi?.url, ...(site?.urlRules?.allow ?? [])].join("\n");
    assert.match(urls, expectedPath, `${slug} must use its own Sony Music artist path`);
  }

  for (const slug of ["nct-wish", "nct-dream"]) {
    const site = SITE_CONFIGS.find((candidate) => candidate.artistSlug === slug);
    assert.ok(site?.articleRules?.includeAny?.length, `${slug} must filter the shared NCT feed by name`);
  }
  assert.equal(SITE_CONFIGS.some((site) => site.newsListUrl.includes("artist=105")), false);
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
  assert.match(files, /まだ予想図がありません/);
  assert.match(files, /座席表・座席予想/);
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

test("favorite controls are functional, compact, and outside navigation links", () => {
  const favoriteButton = fs.readFileSync(
    path.join(projectRoot, "src/components/auth/FavoriteArtistButton.tsx"),
    "utf8",
  );
  const homeCard = fs.readFileSync(
    path.join(projectRoot, "src/components/home/UpcomingEventCard.tsx"),
    "utf8",
  );
  const artistClient = fs.readFileSync(
    path.join(projectRoot, "src/app/artists/[slug]/ArtistClient.tsx"),
    "utf8",
  );
  const searchPage = fs.readFileSync(
    path.join(projectRoot, "src/app/search/page.tsx"),
    "utf8",
  );

  assert.match(favoriteButton, /from\("favorite_artists"\)\.insert/);
  assert.match(favoriteButton, /from\("favorite_artists"\)\.delete/);
  assert.match(favoriteButton, /aria-pressed=\{favorite\}/);
  assert.match(homeCard, /<FavoriteArtistButton/);
  assert.doesNotMatch(homeCard, /<button/);
  assert.doesNotMatch(homeCard, /M4\.318 6\.318/);
  assert.match(artistClient, /過去の公演[\s\S]*<FavoriteArtistButton/);
  assert.doesNotMatch(artistClient, /<HeroSection[\s\S]*\/>\s*<FavoriteArtistButton/);
  assert.match(searchPage, /<\/Link>\s*\{favoritesReady \? \(\s*<FavoriteArtistButton/);
});

test("artist action hub keeps every destination visible in a compact mobile grid", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "src/components/artist-page/ArtistActionHub.tsx"),
    "utf8",
  );

  for (const destination of ["#ticket-data", "#seat-map", "#reports", "/setlist", "#fan-board"]) {
    assert.match(source, new RegExp(destination.replace("/", "\\/")));
  }
  for (const label of ["当落を見る", "座席を見る", "現地レポ", "セトリ", "ファン掲示板"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /\{artistName\}のライブ情報/);
  assert.doesNotMatch(source, /どこから見る/);
  assert.match(source, /min-h-\[72px\]/);
  assert.match(source, /min-h-\[64px\]/);
  assert.doesNotMatch(source, /min-h-\[112px\]/);
  assert.doesNotMatch(source, /overflow-x-auto/);
});

test("artist seat and fan board introductions stay concise", () => {
  const seatSource = fs.readFileSync(
    path.join(projectRoot, "src/components/artist-page/SeatPredictionPreviewSection.tsx"),
    "utf8",
  );
  const boardSource = [
    "src/components/artist-page/ArtistBoardPreview.tsx",
    "src/components/artist-page/ArtistFanBoard.tsx",
  ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

  assert.match(seatSource, /座席表・座席予想/);
  assert.doesNotMatch(seatSource, /公演会場を選ぶと/);
  assert.match(boardSource, /ファン掲示板/);
  assert.match(boardSource, /投稿する/);
  assert.match(boardSource, /投稿一覧/);
  assert.doesNotMatch(boardSource, /自由に話す/);
  assert.doesNotMatch(boardSource, /WRITE A MESSAGE/);
});

test("home hero explains the core features and reserves a monetization banner", () => {
  const heroSource = [
    "src/components/home/HeroBanner.tsx",
    "src/components/home/HomeHeroPromoBanner.tsx",
  ].map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

  assert.match(heroSource, /当落・座席予想・現地レポ。/);
  assert.match(heroSource, /すべてがここに集まる。/);
  assert.equal((heroSource.match(/<span className="(?:mt-1 )?block whitespace-nowrap/g) ?? []).length, 2);
  assert.match(heroSource, /data-monetization-slot="home-first-view"/);
  assert.match(heroSource, /\/news\/how-to-use-tixrepo/);
  assert.match(heroSource, /\/artists\/seventeen/);
  assert.match(heroSource, /\/artists\/yoasobi/);
  assert.match(heroSource, /snap-x snap-mandatory overflow-x-auto/);
  assert.match(heroSource, /aria-current=\{activeIndex === index/);
  assert.match(heroSource, /href="\/search"/);
  assert.match(heroSource, /href="\/report"/);
  assert.doesNotMatch(heroSource, /FAN COMMUNITY/);
  assert.doesNotMatch(heroSource, /ライブのこと、/);
  assert.doesNotMatch(heroSource, /実際に行ったファンの記録/);
});

test("featured home event cards stay compact with single-line text", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "src/components/home/UpcomingEventCard.tsx"),
    "utf8",
  );

  assert.match(source, /min-h-\[132px\]/);
  assert.match(source, /sm:min-h-\[146px\]/);
  assert.doesNotMatch(source, /sm:min-h-\[220px\]/);
  assert.doesNotMatch(source, /line-clamp-2/);
  assert.match(source, /truncate[^>]*>\{item\.period\}/);
  assert.match(source, /truncate[^>]*>\{item\.artist\}/);
  assert.match(source, /truncate[^>]*>\{item\.eventName\}/);
  assert.match(source, /truncate[^>]*>\{item\.venue\}/);
  assert.match(source, /公演を見る →/);
});

test("home login CTA leads with saved records and realtime feed respects X visibility", () => {
  const loginSource = fs.readFileSync(
    path.join(projectRoot, "src/components/home/LoginCta.tsx"),
    "utf8",
  );
  const feedSource = fs.readFileSync(path.join(projectRoot, "src/lib/homeData.ts"), "utf8");
  const feedItemSource = fs.readFileSync(
    path.join(projectRoot, "src/components/home/RealtimeFeedItem.tsx"),
    "utf8",
  );

  assert.match(loginSource, /ログインで記録を保存/);
  assert.match(loginSource, /チケット記録を保存して、推しを登録しよう！/);
  for (const table of ["event_ticket_results", "seat_reports", "fan_seat_predictions", "after_reports"]) {
    assert.match(feedSource, new RegExp(`from\\("${table}"\\)[\\s\\S]*?select\\("[^"]*user_id`));
  }
  assert.match(feedSource, /from\("profiles"\)[\s\S]*?eq\("show_x_on_posts", true\)/);
  assert.match(feedSource, /xHandle: r\.user_id \? xHandleMap\.get\(r\.user_id\) \?\? null : null/);
  assert.match(feedItemSource, /@\{item\.xHandle\}/);
});

test("home venue and login CTAs align their mobile content from the same top edge", () => {
  for (const component of ["VenueDiscoveryCta.tsx", "LoginCta.tsx"]) {
    const source = fs.readFileSync(
      path.join(projectRoot, "src/components/home", component),
      "utf8",
    );
    assert.match(source, /justify-start[^"]*sm:justify-between/);
    assert.match(source, /className="mt-2 sm:mt-0"/);
  }
});

test("curated SEO profiles use sourced substantial content instead of thin generated pages", async () => {
  const { getArtistSeoProfile, getVenueSeoProfile } = await import("@/lib/seoProfiles");
  const venue = getVenueSeoProfile("k-arena");
  const artist = getArtistSeoProfile("niziu");

  assert.ok(venue);
  assert.ok(artist);
  assert.ok(venue.summary.length >= 80);
  assert.ok(venue.sections.length >= 3);
  assert.ok(venue.sources.length >= 3);
  assert.equal(venue.capacity, 20000);
  assert.ok(artist.summary.length >= 80);
  assert.ok(artist.sections.length >= 2);
  assert.ok(artist.sources.every((source) => source.url.startsWith("https://")));
});

test("report entry back link stays above the hero and describes its actual destination", () => {
  const reportEntry = fs.readFileSync(
    path.join(projectRoot, "src/app/report/page.tsx"),
    "utf8",
  );
  assert.match(reportEntry, /top-0 z-20 flex/);
  assert.match(reportEntry, /const backHref = artist \? `\/artists\/\$\{artist\.slug\}` : "\/"/);
  assert.match(reportEntry, /const backLabel = artist \? "アーティストページに戻る" : "TOPへ戻る"/);
  assert.match(reportEntry, /aria-label=\{backLabel\}/);
});

test("configured hero image has a runtime missing-file fallback", () => {
  const hero = fs.readFileSync(
    path.join(projectRoot, "src/components/artist-page/HeroSection.tsx"),
    "utf8",
  );
  assert.match(hero, /onError=/);
  assert.match(hero, /DEFAULT_ARTIST_HERO_IMAGE/);
});
