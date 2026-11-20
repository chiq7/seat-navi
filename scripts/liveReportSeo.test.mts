import assert from "node:assert/strict";
import test from "node:test";
import robots from "../src/app/robots.ts";
import { canIndexLiveReport, liveReportTitle } from "../src/lib/liveReportSeo.ts";

const performance = { title: "Tour", venue: "東京ドーム", date: "2026-11-19" };

test("report metadata and sitemap require an identified artist and a confirmed date", () => {
  assert.equal(canIndexLiveReport(performance, "Artist", false), true);
  assert.equal(canIndexLiveReport(performance, "  ", false), false);
  assert.equal(canIndexLiveReport(performance, null, false), false);
  assert.equal(canIndexLiveReport(performance, "Artist", true), false);
  assert.equal(canIndexLiveReport({ ...performance, date: null }, "Artist", false), false);
  for (const title of ["ツアー（開催日未確認）", "日程未定のライブ"]) {
    assert.equal(canIndexLiveReport({ ...performance, title }, "Artist", false), false);
    assert.doesNotMatch(liveReportTitle({ ...performance, title }, "Artist", "11/19(木)"), /11\/19/);
  }
});

test("report title retains available identity without empty separators", () => {
  assert.equal(liveReportTitle(performance, "Artist", "11/19(木)"), "Artist・東京ドームの現地レポ（11/19(木)）｜ちけレポ");
  assert.equal(liveReportTitle({ ...performance, date: null }, null, "日程未定"), "東京ドームの現地レポ｜ちけレポ");
  assert.equal(liveReportTitle({ ...performance, venue: "", date: null }, "", "日程未定"), "現地レポ｜ちけレポ");
});

test("robots leaves fan predictions crawlable for the page-level noindex", () => {
  const rules = robots().rules;
  assert.equal(Array.isArray(rules), false);
  assert.deepEqual(rules, { userAgent: "*", allow: "/", disallow: ["/api/cron/"] });
});
