import assert from "node:assert/strict";
import { test } from "node:test";
import { liveReportAreaCode, submitLiveReport, type LiveReportAttempt } from "../src/lib/liveReportSubmission.ts";

const success = { error: null };
function draft(count = 0): LiveReportAttempt {
  return {
    row: { id: "report-1", event_id: "night", user_id: null },
    photos: Array.from({ length: count }, (_, i) => ({
      path: i + ".jpg", uploaded: false, file: new File(["photo"], i + ".jpg", { type: "image/jpeg" }),
    })),
    writingRow: false,
  };
}

test("records only explicitly identified seat categories", () => {
  assert.equal(liveReportAreaCode("アリーナ", ""), "arena");
  assert.equal(liveReportAreaCode("1階席", ""), "stand_1f");
  assert.equal(liveReportAreaCode("スタンド", ""), null);
  assert.equal(liveReportAreaCode("2階席以上", ""), null);
  assert.equal(liveReportAreaCode("バルコニー", ""), null);
  assert.equal(liveReportAreaCode("スタンド", "2階"), "stand_2f");
});

test("retries an interrupted upload at the original path and acknowledges the post once", async () => {
  const attempt = draft(2);
  const uploads: string[] = [];
  const rows: string[] = [];
  const writers = {
    upload: async ({ path }: { path: string }) => {
      uploads.push(path);
      if (uploads.length === 2) throw new Error("network");
      if (uploads.length === 3) return { error: { message: "Resource already exists", statusCode: "409" } };
      return success;
    },
    insert: async ({ id }: { id: string }) => { rows.push(id); return success; },
    matchesExisting: async () => false,
  };
  await assert.rejects(() => submitLiveReport(attempt, writers));
  assert.equal(attempt.writingRow, false);
  await submitLiveReport(attempt, writers);
  assert.deepEqual(uploads, ["0.jpg", "1.jpg", "1.jpg"]);
  assert.deepEqual(rows, ["report-1"]);
});

test("lost database acknowledgement reuses the immutable row, then verifies its duplicate", async () => {
  const attempt = draft();
  let calls = 0;
  let verification = 0;
  const writers = {
    upload: async () => success,
    insert: async (row: typeof attempt.row) => {
      assert.equal(row, attempt.row);
      if (++calls === 1) throw new Error("network");
      return { error: { code: "23505", message: "duplicate" } };
    },
    matchesExisting: async (row: typeof attempt.row) => { verification++; return row.event_id === "night"; },
  };
  await assert.rejects(() => submitLiveReport(attempt, writers));
  assert.equal(attempt.writingRow, true);
  await submitLiveReport(attempt, writers);
  assert.equal(verification, 1);
  await assert.rejects(() => submitLiveReport(attempt, { ...writers, matchesExisting: async () => false }));
});

test("definite database rejection allows editing, and rejected uploads never insert", async () => {
  const attempt = draft(1);
  let inserts = 0;
  const writers = {
    upload: async () => ({ error: { message: "too large", statusCode: 413 } }),
    insert: async () => { inserts++; return { error: { message: "violated check", code: "23514" } }; },
    matchesExisting: async () => false,
  };
  await assert.rejects(() => submitLiveReport(attempt, writers));
  assert.equal(inserts, 0);
  await assert.rejects(() => submitLiveReport(attempt, { ...writers, upload: async () => success }));
  assert.equal(attempt.writingRow, false);
});
