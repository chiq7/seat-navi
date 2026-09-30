import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { applyEventDayNewsReview, eventDayNewsFingerprint, extractEventDayNewsEvidence, planEventDayNews,
  type EventDayNewsArticle, type EventDayNewsEvent, type EventDayNewsReview } from "../src/lib/eventDayNews";
import { parseEventDayNewsArgs, readEventDayNewsInputs, redactEventDayNewsQuotes } from "./syncEventDayNews.mts";
import type { SupabaseClient } from "@supabase/supabase-js";

const event: EventDayNewsEvent = { id: "show-a", artist_slug: "test-artist", title: "TEST TOUR", venue: "確認用アリーナ", venue_id: "test-arena", date: "2026-09-30" };
const article: EventDayNewsArticle = { id: "news-a", artist_slug: "test-artist", article_title: "TEST TOUR グッズ販売",
  article_url: "https://example.com/news/a", category: "goods", event_name: "TEST TOUR", tour_name: null,
  event_dates: ["2026-09-30"], venue_names: ["確認用アリーナ"], confidence: "high", needs_review: false,
  article_body: "【販売時間】\n2026年9月30日 確認用アリーナ 12:00〜18:00\n販売場所：1Fバス乗降所\n対象：公演チケットをお持ちの方\nQRコードをご提示ください。\n引換締切：開演30分前まで" };
const make = (change: Partial<EventDayNewsArticle> = {}) => ({ ...structuredClone(article), ...change });

test("existing exact artist/date/venue becomes only a candidate, never a new or public event", () => {
  const original = structuredClone(event);
  const plan = planEventDayNews([article], [event]);
  assert.equal(plan.length, 1); assert.equal(plan[0].eventId, event.id); assert.equal(plan[0].status, "candidate");
  assert.deepEqual(event, original); assert.equal(plan[0].evidence.every(item => item.status === "candidate"), true);
  assert.equal(plan[0].missingFields.length, 0);
});
test("different artist, date, venue and missing event cannot be silently linked", () => {
  for (const changed of [{ artist_slug: "other" }, { date: "2026-10-01" }, { venue: "別会場" }]) {
    const candidate = planEventDayNews([article], [{ ...event, ...changed }])[0];
    assert.equal(candidate.eventId, null); assert.equal(candidate.status, "needs-review");
  }
  assert.equal(planEventDayNews([article], []).length, 1);
});
test("session missing or different remains unresolved, exact explicit session can match", () => {
  const day = { ...event, id: "day", title: "TEST TOUR 昼公演" }, night = { ...event, id: "night", title: "TEST TOUR 夜公演" };
  const missing = planEventDayNews([article], [day, night])[0];
  assert.equal(missing.eventId, null); assert.deepEqual(missing.possibleEventIds, ["day", "night"]);
  assert.equal(planEventDayNews([make({ event_name: "TEST TOUR 夜公演" })], [day, night])[0].eventId, "night");
});
test("exact source quote and offsets remain grounded; missing fields are not previous-template values", () => {
  const evidence = extractEventDayNewsEvidence(article);
  for (const item of evidence) assert.equal(article.article_body!.slice(item.sourceStart, item.sourceEnd), item.quote);
  for (const item of evidence) if (item.context) assert.equal(article.article_body!.slice(item.context.sourceStart, item.context.sourceEnd), item.context.quote);
  assert.equal(evidence.some(item => item.field === "deadline" && item.quote.includes("開演30分前")), true);
  const missing = planEventDayNews([make({ article_body: null })], [event])[0];
  assert.deepEqual(missing.evidence, []); assert.deepEqual(missing.missingFields, ["hours", "place", "conditions", "preparation"]);
  assert.equal(missing.status, "needs-review");
});
test("multi-day flattened text keeps date-specific times apart without deriving clocks", () => {
  const input = make({ event_dates: ["2026-09-29", "2026-09-30"], article_body:
    "【先行販売時間】9月29日(火)確認用アリーナ12:00〜18:00 9月30日(水)確認用アリーナ12:00〜17:30" });
  const candidates = planEventDayNews([input], [{ ...event, id: "first", date: "2026-09-29" }, event]);
  assert.equal(candidates.length, 2);
  assert.equal(candidates.every(c => c.status === "needs-review"), true);
  assert.equal(candidates[0].evidence.some(e => e.quote.includes("17:30")), false);
  assert.equal(candidates[1].evidence.some(e => e.quote.includes("18:00")), false);
});
test("multiple venue metadata is never positionally paired; corrections and images require review", () => {
  const candidate = planEventDayNews([make({ venue_names: ["確認用アリーナ", "別会場"], article_title: "グッズ販売時間訂正",
    article_body: `${article.article_body}\n会場マップは画像をご確認ください。` })], [event])[0];
  assert.equal(candidate.status, "needs-review"); assert.equal(candidate.correction, true);
  assert.equal(candidate.reasons.some(reason => reason.includes("複数会場")), true);
  assert.equal(candidate.reasons.some(reason => reason.includes("画像内")), true);
  assert.equal(candidate.reasons.some(reason => reason.includes("訂正")), true);
});
test("yearless, impossible date and low-confidence metadata cannot qualify", () => {
  for (const input of [make({ event_dates: ["09-30"] }), make({ event_dates: ["2026-02-30"] }), make({ confidence: "medium" }), make({ needs_review: true })]) {
    assert.equal(planEventDayNews([input], [event])[0].status, "needs-review");
  }
});
test("human review requires grounded evidence, existing event and current fingerprint", () => {
  const candidate = planEventDayNews([article], [event])[0];
  const review: EventDayNewsReview = { eventId: event.id, reviewer: "editor", checkedAt: "2026-09-30",
    sourceFingerprint: candidate.fingerprint, confirmedEvidenceIds: candidate.evidence.map(item => item.id),
    resolvedReasons: [], acknowledgedMissingFields: [], status: "verified" };
  assert.equal(applyEventDayNewsReview(candidate, review).status, "verified");
  assert.equal(applyEventDayNewsReview(candidate, { ...review, status: "published" }).status, "published");
  assert.equal(candidate.status, "candidate");
  assert.throws(() => applyEventDayNewsReview(candidate, { ...review, eventId: "invented" }));
  assert.throws(() => applyEventDayNewsReview(candidate, { ...review, confirmedEvidenceIds: [] }));
  assert.throws(() => applyEventDayNewsReview(candidate, { ...review, checkedAt: "2026-02-30" }));
  assert.throws(() => applyEventDayNewsReview(candidate, { ...review, sourceFingerprint: eventDayNewsFingerprint(make({ article_body: "更新された原文" })) }));
  const unresolved = planEventDayNews([make({ needs_review: true })], [event])[0];
  assert.throws(() => applyEventDayNewsReview(unresolved, { ...review, sourceFingerprint: unresolved.fingerprint }));
});
test("two unmarked events in one slot stay a single unmatched candidate", () => {
  const candidate = planEventDayNews([article], [event, { ...event, id: "show-b", title: "TEST TOUR another title" }])[0];
  assert.equal(candidate.eventId, null); assert.equal(candidate.status, "needs-review");
  assert.deepEqual(candidate.possibleEventIds, [event.id, "show-b"]);
});
test("unrelated online release does not generate event-day activity", () => {
  assert.deepEqual(planEventDayNews([make({ article_title: "配信リリース", article_body: "新曲を配信します" })], [event]), []);
});
test("CLI is explicitly read-only, bounded and rejects execute or incomplete options", () => {
  assert.equal(parseEventDayNewsArgs(["--read-live", "--artist", "test-artist"]).limit, 100);
  assert.equal(parseEventDayNewsArgs(["--input", "data.json", "--event", "show-a"]).event, "show-a");
  for (const argv of [[], ["--execute"], ["--read-live", "--input", "data.json"], ["--read-live", "--limit", "501"], ["--read-live", "--artist"]]) {
    assert.throws(() => parseEventDayNewsArgs(argv));
  }
});
test("CLI quote redaction is explicit, defaults to local review, and rejects duplicate flags", () => {
  assert.equal(parseEventDayNewsArgs(["--read-live"]).redactQuotes, false);
  assert.equal(parseEventDayNewsArgs(["--input", "data.json", "--redact-quotes"]).redactQuotes, true);
  assert.equal(parseEventDayNewsArgs(["--redact-quotes", "--read-live"]).redactQuotes, true);
  assert.throws(() => parseEventDayNewsArgs(["--read-live", "--redact-quotes", "--redact-quotes"]), /Duplicate option/);
  assert.throws(() => parseEventDayNewsArgs(["--read-live", "--redact-quotes", "false"]));
});

test("public artifact redaction removes both source and context quotes without mutating candidates", () => {
  const candidates = planEventDayNews([article], [event]);
  const original = structuredClone(candidates);
  assert.ok(candidates[0].evidence.some(item => item.context));
  const redacted = redactEventDayNewsQuotes(candidates);
  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes('"quote":'), false);
  for (let i = 0; i < candidates[0].evidence.length; i++) {
    const before = candidates[0].evidence[i], after = redacted[0].evidence[i];
    assert.equal(serialized.includes(before.quote), false);
    assert.equal(Object.hasOwn(after, "quote"), false);
    if (before.context) {
      assert.equal(serialized.includes(before.context.quote), false);
      assert.deepEqual(after.context, { sourceStart: before.context.sourceStart, sourceEnd: before.context.sourceEnd });
    }
    assert.equal(after.sourceStart, before.sourceStart); assert.equal(after.sourceEnd, before.sourceEnd);
    assert.equal(after.sourceUrl, before.sourceUrl); assert.equal(after.field, before.field);
    assert.deepEqual(after.dateScope, before.dateScope); assert.equal(after.status, before.status);
  }
  assert.equal(redacted[0].fingerprint, candidates[0].fingerprint);
  assert.equal(redacted[0].status, candidates[0].status);
  assert.deepEqual(redacted[0].reasons, candidates[0].reasons);
  assert.deepEqual(candidates, original);
  redacted[0].evidence[0].dateScope.push("2099-01-01");
  assert.deepEqual(candidates, original);
});
test("DB errors are errors and SELECT output cap is exposed, never success with zero data", async () => {
  const failed = { from: () => ({ select: () => ({ in: () => ({ order: () => ({ order: () => ({ limit: async () => ({ data: null, error: { code: "42501" } }) }) }) }) }) }) } as unknown as SupabaseClient;
  await assert.rejects(readEventDayNewsInputs(failed, parseEventDayNewsArgs(["--read-live"])), /SELECT failed/);
});
test("read-live paginates events and explicitly reports deferred NEWS input", async () => {
  const ranges: number[][] = [];
  const sourceEvents = Array.from({ length: 1001 }, (_, i) => ({ ...event, id: `event-${i}` }));
  const from = (table: string) => {
    let range = [0, 999];
    const query = {
      select: () => query, in: () => query, order: () => query, eq: () => query,
      limit: () => query,
      range: (first: number, last: number) => { range = [first, last]; ranges.push(range); return query; },
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve({
        error: null, data: table === "official_news" ? [article, make({ id: "deferred" })] : sourceEvents.slice(range[0], range[1] + 1),
      }).then(resolve, reject),
    };
    return query;
  };
  const result = await readEventDayNewsInputs({ from } as unknown as SupabaseClient, parseEventDayNewsArgs(["--read-live", "--limit", "1"]));
  assert.equal(result.news.length, 1); assert.equal(result.newsLimitReached, true);
  assert.equal(result.events.length, 1001); assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
});

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = fs.readFileSync(path.join(projectRoot, ".github/workflows/official-news.yml"), "utf8").replace(/\r\n/g, "\n");
const workflowStep = (name: string) => {
  const after = workflow.split(`      - name: ${name}\n`, 2)[1];
  assert.ok(after, `Workflow step is missing: ${name}`);
  return after.split("\n      - name:", 1)[0];
};
const runScript = (step: string) => {
  const script = step.split("        run: |\n", 2)[1];
  assert.ok(script);
  return script.split("\n").map(line => line.startsWith("          ") ? line.slice(10) : line).join("\n");
};

test("review-only workflow defaults off and leaves normal ingestion, quota and sheet operations intact", () => {
  assert.match(workflow, /event_day_review_only:\n        description:[^\n]+\n        required: false\n        type: boolean\n        default: false/);
  assert.match(workflow, /INPUT_EVENT_DAY_REVIEW_ONLY: \$\{\{ inputs\.event_day_review_only \}\}/);
  const crawler = workflowStep("Run official news crawler");
  assert.match(crawler, /^        if: inputs\.event_day_review_only != true/m);
  assert.match(crawler, /--execute --classify "--shard=\$\{SHARD_INDEX\}\/7"/);
  assert.match(crawler, /syncOfficialNewsEvents\.mts --execute/);
  assert.match(workflowStep("Clear Gemini stop status after a successful live run"),
    /if: success\(\) && github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'schedule' \|\| \(inputs\.dry_run == false && inputs\.classify_with_gemini == true\)\)/);
  assert.match(workflowStep("Update operation sheet"),
    /if: always\(\) && github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'schedule' \|\| \(inputs\.dry_run == false && inputs\.classify_with_gemini == true\)\)/);
  assert.match(workflowStep("Report Gemini free-tier stop"), /if: failure\(\) && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflowStep("Upload crawl report"), /path: official-news-reports\//);
});

test("candidate workflow is bounded SELECT only and preserves shell-safe artist filtering", () => {
  const candidate = workflowStep("Prepare event-day guide review candidates (read-only)");
  assert.match(candidate,
    /^        if: vars\.EVENT_DAY_CANDIDATE_ARTIFACT_APPROVED == 'true' && \(inputs\.event_day_review_only == true \|\| github\.event_name == 'schedule' \|\| inputs\.dry_run == false\)/m);
  assert.match(candidate, /SUPABASE_URL: \$\{\{ secrets\.SUPABASE_URL \}\}/);
  assert.match(candidate, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  assert.doesNotMatch(candidate, /GEMINI_API_KEY|--execute|--classify|\$\{\{\s*inputs\./);
  assert.match(candidate, /ARGS=\(--read-live --limit 500 --redact-quotes\)/);
  assert.match(candidate, /ARGS\+=\("--artist" "\$INPUT_ARTIST_SLUG"\)/);
  assert.match(candidate, /syncEventDayNews\.mts "\$\{ARGS\[@\]\}"/);
  assert.ok(workflow.indexOf("Prepare event-day guide") > workflow.indexOf("Run official news crawler"));
  assert.ok(workflow.indexOf("Prepare event-day guide") < workflow.indexOf("Report Gemini free-tier stop"));
});

test("workflow scripts require artifact approval while preserving scheduled/live behavior and review-only isolation", () => {
  const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  const modes = [
    { event: "schedule", reviewOnly: false, dryRun: "", classify: "", approved: "", expectedCrawler: true, expectedCandidate: false },
    { event: "schedule", reviewOnly: false, dryRun: "", classify: "", approved: "false", expectedCrawler: true, expectedCandidate: false },
    { event: "schedule", reviewOnly: false, dryRun: "", classify: "", approved: "true", expectedCrawler: true, expectedCandidate: true },
    { event: "workflow_dispatch", reviewOnly: false, dryRun: "true", classify: "false", approved: "true", expectedCrawler: true, expectedCandidate: false },
    { event: "workflow_dispatch", reviewOnly: false, dryRun: "false", classify: "true", approved: "", expectedCrawler: true, expectedCandidate: false },
    { event: "workflow_dispatch", reviewOnly: false, dryRun: "false", classify: "true", approved: "true", expectedCrawler: true, expectedCandidate: true },
    { event: "workflow_dispatch", reviewOnly: true, dryRun: "true", classify: "false", approved: "", expectedCrawler: false, expectedCandidate: false },
    { event: "workflow_dispatch", reviewOnly: true, dryRun: "true", classify: "false", approved: "true", expectedCrawler: false, expectedCandidate: true },
  ];
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "event-day-workflow-"));
  try {
    for (const mode of modes) {
      // Conditions are locked to the exact GitHub boolean expressions in the contract tests above.
      const candidateAllowed = mode.approved === "true" &&
        (mode.reviewOnly || mode.event === "schedule" || mode.dryRun === "false");
      assert.equal(candidateAllowed, mode.expectedCandidate);
      const scripts = [
        ...(mode.expectedCrawler ? [runScript(workflowStep("Run official news crawler"))] : []),
        ...(mode.expectedCandidate ? [runScript(workflowStep("Prepare event-day guide review candidates (read-only)"))] : []),
      ];
      const program = 'node() { printf "NODE:"; printf "<%s>" "$@"; printf "\\n"; }\n' +
        scripts.map(script => `(\n${script}\n)\n`).join("");
      const result = spawnSync(bash, ["-c", program], {
        cwd: temporary, encoding: "utf8",
        env: { ...process.env, WORKFLOW_EVENT_NAME: mode.event, INPUT_DRY_RUN: mode.dryRun,
          INPUT_CLASSIFY_WITH_GEMINI: mode.classify, INPUT_EVENT_DAY_REVIEW_ONLY: String(mode.reviewOnly),
          INPUT_ARTIST_SLUG: "stray-kids", INPUT_GROUP: "" },
      });
      assert.equal(result.status, 0, result.error?.message ?? result.stderr);
      assert.equal(result.stdout.includes("crawlOfficialNews.mts"), mode.expectedCrawler);
      assert.equal(result.stdout.includes("syncEventDayNews.mts"), mode.expectedCandidate);
      if (mode.expectedCandidate) {
        const command = result.stdout.split("\n").find(line => line.includes("syncEventDayNews.mts"))!;
        assert.match(command, /<--read-live><--limit><500><--redact-quotes><--artist><stray-kids>/);
        assert.doesNotMatch(command, /--execute|--classify/);
      }
      if (mode.reviewOnly) assert.doesNotMatch(result.stdout, /crawlOfficialNews|syncOfficialNewsEvents|--execute|--classify/);
      if (mode.event === "schedule") assert.match(result.stdout, /<--execute><--classify><--shard=[0-6]\/7>/);
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("the real CLI writes grounded candidates offline without logging source text or changing its input", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "event-day-cli-"));
  try {
    const inputPath = path.join(temporary, "fixture.json");
    const reportPath = path.join(temporary, "candidate-report.json");
    const fixture = JSON.stringify({ news: [article], events: [event] });
    fs.writeFileSync(inputPath, fixture);
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types", "--import", "./scripts/ts-loader.mjs",
      "./scripts/syncEventDayNews.mts", "--input", inputPath,
      "--artist", "test-artist", "--event", "show-a", "--output", reportPath,
    ], { cwd: projectRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    const output = JSON.parse(result.stdout.trim());
    assert.equal(output.mode, "offline");
    assert.deepEqual(output.counts, { candidate: 1, "needs-review": 0, verified: 0, published: 0 });
    assert.equal(output.databaseWrites, 0);
    assert.equal(output.publicWrites, 0);
    assert.doesNotMatch(result.stdout, /"article_body"\s*:|販売場所|QRコード|"quote"\s*:/);
    assert.equal(fs.readFileSync(inputPath, "utf8"), fixture);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    assert.equal(report.apiClassificationCalls, 0);
    assert.equal(report.candidates[0].status, "candidate");
    assert.equal(report.candidates[0].eventId, "show-a");
    assert.equal(report.candidates[0].evidence.length > 0, true);
    assert.equal(report.candidates[0].evidence.every((item: { quote: string; sourceStart: number; sourceEnd: number }) =>
      article.article_body!.slice(item.sourceStart, item.sourceEnd) === item.quote), true);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("the real CLI artifact option removes all quote text while keeping source offsets and fingerprint", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "event-day-cli-redacted-"));
  try {
    const inputPath = path.join(temporary, "fixture.json");
    const reportPath = path.join(temporary, "artifact.json");
    fs.writeFileSync(inputPath, JSON.stringify({ news: [article], events: [event] }));
    const result = spawnSync(process.execPath, [
      "--experimental-strip-types", "--import", "./scripts/ts-loader.mjs",
      "./scripts/syncEventDayNews.mts", "--input", inputPath, "--output", reportPath, "--redact-quotes",
    ], { cwd: projectRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    const output = JSON.parse(result.stdout.trim());
    const serialized = fs.readFileSync(reportPath, "utf8");
    const report = JSON.parse(serialized);
    assert.equal(output.quotesRedacted, true);
    assert.equal(report.quotesRedacted, true);
    assert.equal(report.databaseWrites, 0);
    assert.equal(report.publicWrites, 0);
    assert.equal(report.apiClassificationCalls, 0);
    assert.doesNotMatch(serialized, /"quote"\s*:|"article_body"\s*:|QRコード|1Fバス乗降所/);
    const expected = planEventDayNews([article], [event])[0];
    assert.equal(report.candidates[0].fingerprint, expected.fingerprint);
    assert.equal(report.candidates[0].evidence.length, expected.evidence.length);
    for (const item of report.candidates[0].evidence) {
      const grounded = expected.evidence.find(evidence => evidence.id === item.id)!;
      assert.equal(item.sourceStart, grounded.sourceStart);
      assert.equal(item.sourceEnd, grounded.sourceEnd);
      assert.equal(item.sourceUrl, grounded.sourceUrl);
      assert.equal(Object.hasOwn(item, "quote"), false);
      if (item.context) assert.equal(Object.hasOwn(item.context, "quote"), false);
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("Vercel ignores only the latest NEWS-only release marker and preserves existing regions and cron configuration", () => {
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8"));
  const marker = "tixrepo-news-only-release-20260930";
  assert.equal(config.ignoreCommand, `git log -1 --format=%B | grep -Fxq '${marker}'`);
  assert.deepEqual(config.regions, ["hnd1"]);
  assert.deepEqual(config.crons, [
    { path: "/api/cron/fetch-events", schedule: "0 2 * * 1" },
    { path: "/api/cron/fetch-external-seats", schedule: "5 0 * * *" },
  ]);
  assert.equal(Object.hasOwn(config, "git"), false);
  const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  for (const [message, expected] of [
    [`chore: reviewed NEWS release\n\n${marker}\n`, 0],
    ["feat: next public UI release", 1],
    [`prefix ${marker} suffix`, 1],
  ] as const) {
    const result = spawnSync(bash, ["-c",
      'git() { printf "%s\\n" "$TASK_TEST_COMMIT_MESSAGE"; }\n' + config.ignoreCommand,
    ], { encoding: "utf8", env: { ...process.env, TASK_TEST_COMMIT_MESSAGE: message } });
    assert.equal(result.status, expected, result.error?.message ?? result.stderr);
  }
});
