import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync("src/lib/serverPerformanceReportCount.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const local = { exports: {} as typeof import("../src/lib/serverPerformanceReportCount") };
new Function("require", "exports", code)((id: string) => {
  assert.ok(["server-only","./supabase/public","@/data/hiddenLiveReports"].includes(id));
  return id === "@/data/hiddenLiveReports" ? { isHiddenLiveReport: (reportId: string) => reportId === "hidden-test" } : {};
}, local.exports);

function client(seats: string[], reports: string[], failed = false) {
  return { from(table: string) {
    assert.ok(["seat_reports", "after_reports"].includes(table));
    return {select(columns: string) {
      assert.equal(columns, table === "seat_reports" ? "event_id" : "id");
      return {in(key: string, ids: string[]) {
        assert.equal(key, "event_id");
        return {limit(max: number) {
          assert.equal(max, table === "seat_reports" ? 4 : 8);
          const rows = (table === "seat_reports" ? seats : reports).filter(id => ids.includes(id)).slice(0, max);
          return {data: failed ? null : rows.map((id, i) => table === "seat_reports" ? {event_id: id} : {id: `report-${i}`}), error: failed ? Error("offline") : null};
        }};
      }};
    }};
  }} as unknown as Parameters<typeof local.exports.queryPerformanceReportCount>[0];
}

test("same performance aliases are counted without including other days or the evening show", async () => {
  const db = client(["day","same-show","night","tomorrow"], ["same-show","night"]);
  assert.equal(await local.exports.queryPerformanceReportCount(db, ["day","same-show"]), 3);
  assert.equal(await local.exports.queryPerformanceReportCount(db, ["tomorrow"]), 1);
});

test("the preview threshold is bounded at four, regardless of how many later reports exist", async () => {
  for (const n of [0,1,2,3,4,5,100]) {
    assert.equal(await local.exports.queryPerformanceReportCount(client(Array(n).fill("d"), []), ["d"]), Math.min(n,4));
  }
});

test("a failed read or missing performance is unknown", async () => {
  assert.equal(await local.exports.queryPerformanceReportCount(client([],[],true), ["new"]), null);
  assert.equal(await local.exports.queryPerformanceReportCount(client([],[]), []), null);
});
