import assert from "node:assert/strict";
import test from "node:test";
import { planOfficialNewsEvents, toEventUpsertRows, type OfficialNewsEventCandidate } from "./eventSync";

function candidate(overrides: Partial<OfficialNewsEventCandidate> = {}): OfficialNewsEventCandidate {
  return {
    id: "news-1",
    artist_slug: "yoasobi",
    article_title: "LIVE TOUR 2026 開催決定",
    category: "live",
    is_event_candidate: true,
    event_name: "LIVE TOUR 2026",
    tour_name: "LIVE TOUR 2026",
    event_dates: ["2026-10-24", "2026-10-25"],
    venue_names: ["京セラドーム大阪"],
    confidence: "high",
    needs_review: false,
    ...overrides,
  };
}

test("one venue expands to every valid date and strips source metadata before upsert", () => {
  const plan = planOfficialNewsEvents([candidate()], []);
  assert.equal(plan.newRows.length, 2);
  assert.deepEqual(plan.newRows.map((row) => row.venue_id), ["kyocera-dome", "kyocera-dome"]);
  assert.deepEqual(plan.newRows.map((row) => row.date), ["2026-10-24", "2026-10-25"]);
  assert.equal("source_news_id" in toEventUpsertRows(plan.newRows)[0], false);
});

test("tour dates are paired in equal consecutive venue groups", () => {
  const plan = planOfficialNewsEvents([
    candidate({
      event_dates: ["2026-10-24", "2026-10-25", "2026-11-07", "2026-11-08"],
      venue_names: ["京セラドーム大阪", "東京ドーム"],
    }),
  ], []);
  assert.deepEqual(plan.newRows.map((row) => `${row.date}:${row.venue_id}`), [
    "2026-10-24:kyocera-dome",
    "2026-10-25:kyocera-dome",
    "2026-11-07:tokyo-dome",
    "2026-11-08:tokyo-dome",
  ]);
});

test("review, vague venue, invalid dates, and irrelevant events are deferred", () => {
  const inputs = [
    candidate({ id: "review", needs_review: true }),
    candidate({ id: "vague", venue_names: ["都内某所"] }),
    candidate({ id: "date", event_dates: ["10月24日"] }),
    candidate({ id: "sports", article_title: "野球の試合に出演決定", event_name: "野球の試合", tour_name: null }),
  ];
  const plan = planOfficialNewsEvents(inputs, []);
  assert.equal(plan.newRows.length, 0);
  assert.equal(plan.decisions.filter((item) => item.status === "deferred").length, 4);
});

test("physical release, fan meeting, and offline signing events remain eligible", () => {
  const inputs = [
    candidate({ id: "release", article_title: "CD発売記念リリースイベント", event_name: "CD発売記念リリースイベント", tour_name: null, event_dates: ["2026-08-01"] }),
    candidate({ id: "fanmeeting", article_title: "ファンミーティング開催", event_name: "SPECIAL FAN MEETING", tour_name: null, event_dates: ["2026-08-02"] }),
    candidate({ id: "signing", article_title: "オフラインサイン会開催", event_name: "オフラインサイン会", tour_name: null, event_dates: ["2026-08-03"] }),
  ];
  const plan = planOfficialNewsEvents(inputs, []);
  assert.equal(plan.newRows.length, 3);
  assert.equal(plan.decisions.filter((item) => item.status === "planned").length, 3);
});

test("a physical artist event does not require a live-specific keyword", () => {
  const plan = planOfficialNewsEvents([
    candidate({
      id: "artist-event",
      article_title: "参加者限定のお渡し会を開催します",
      event_name: "参加者限定のお渡し会",
      tour_name: null,
      event_dates: ["2026-08-04"],
      venue_names: ["HMV&BOOKS SHIBUYA"],
    }),
  ], []);
  assert.equal(plan.newRows.length, 1);
});

test("existing artist-date-venue prevents a duplicate even when title differs", () => {
  const plan = planOfficialNewsEvents([candidate({ event_dates: ["2026-10-24"] })], [{
    id: "existing",
    title: "別表記のツアータイトル",
    venue: "京セラドーム大阪",
    venue_id: "kyocera-dome",
    date: "2026-10-24",
    genre: "other",
    artist_slug: "yoasobi",
  }]);
  assert.equal(plan.newRows.length, 0);
  assert.equal(plan.existingRows.length, 1);
  assert.equal(plan.decisions[0].status, "already_exists");
});

test("multiple news articles collapse to one artist-date-venue event", () => {
  const plan = planOfficialNewsEvents([
    candidate({ id: "first", event_dates: ["2026-10-24"] }),
    candidate({ id: "second", event_dates: ["2026-10-24"] }),
  ], []);
  assert.equal(plan.newRows.length, 1);
});

test("unknown concrete venues receive a stable non-empty id", () => {
  const first = planOfficialNewsEvents([candidate({ event_dates: ["2026-10-24"], venue_names: ["Example Music Hall"] })], []);
  const second = planOfficialNewsEvents([candidate({ event_dates: ["2026-10-24"], venue_names: ["Example Music Hall"] })], []);
  assert.match(first.newRows[0].venue_id, /^official-news-[a-f0-9]{16}$/);
  assert.equal(first.newRows[0].venue_id, second.newRows[0].venue_id);
});

test("long-running date ranges and festival-wide dates are retained for review instead of expanded", () => {
  const longDates = Array.from({ length: 15 }, (_, index) => `2026-08-${String(index + 1).padStart(2, "0")}`);
  const plan = planOfficialNewsEvents([
    candidate({ id: "long", event_name: "ARTIST EXHIBITION", tour_name: null, event_dates: longDates, venue_names: ["New Gallery"] }),
    candidate({ id: "festival", event_name: "MUSIC FESTIVAL 2026", tour_name: null, event_dates: ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"], venue_names: ["Festival Park"] }),
  ], []);
  assert.equal(plan.newRows.length, 0);
  assert.equal(plan.decisions.filter((item) => item.status === "deferred").length, 2);
});

test("a reviewed vague-venue offline event uses its confirmed manual events", () => {
  const plan = planOfficialNewsEvents([candidate({
    id: "6151972d-0f48-4b34-ae2d-3398a36979e4",
    artist_slug: "zerobaseone",
    venue_names: ["東京都某所"],
    needs_review: true,
  })], []);
  assert.equal(plan.newRows.length, 3);
  assert.equal(plan.newRows[0].venue, "東京都某所");
  assert.equal(plan.decisions[0].status, "planned");
});

test("screenings and online meet-and-greets stay in news for their future dedicated page", () => {
  const plan = planOfficialNewsEvents([
    candidate({ id: "00873e2d-bb0b-4d07-ba73-827a64ba7d13", artist_slug: "me-i" }),
    candidate({ id: "9590aa79-540a-4ffe-b699-0ad8ecce7614", artist_slug: "nogizaka46" }),
  ], []);
  assert.equal(plan.newRows.length, 0);
  assert.deepEqual(plan.decisions.map((decision) => decision.status), ["ignored", "ignored"]);
});

test("a reviewed mixed-artist article is assigned to its actual registered artists", () => {
  const plan = planOfficialNewsEvents([candidate({
    id: "6db1aac9-6618-4721-9da3-3ac34d3d983a",
    artist_slug: "acees",
    event_dates: [],
    venue_names: [],
    needs_review: true,
  })], []);
  assert.equal(plan.newRows.length, 4);
  assert.deepEqual(new Set(plan.newRows.map((row) => row.artist_slug)), new Set(["kento-nakajima", "travis-japan"]));
  assert.equal(plan.newRows.some((row) => row.artist_slug === "acees"), false);
});

test("reviewed non-events are recorded as ignored instead of deferred", () => {
  const plan = planOfficialNewsEvents([candidate({
    id: "98cf63b4-eb71-49ab-b5b4-0811f3296921",
    artist_slug: "nogizaka46",
    article_title: "野球の試合",
  })], []);
  assert.equal(plan.newRows.length, 0);
  assert.equal(plan.decisions[0].status, "ignored");
});
