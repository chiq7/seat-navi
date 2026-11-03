import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseSeatInput, summarizeCampaign, campaignChanges, campaignDrafts, type CampaignReport } from "../src/lib/seat-campaign/model.ts";
import { campaignImageRows, imageTextUnits } from "../src/lib/seat-campaign/imageRows.ts";
import { PILOT_EVENT as event } from "../src/lib/seat-campaign/pilot.ts";
import { readLocalCampaign, saveLocalReport, saveLocalBaseline } from "../src/lib/seat-campaign/localStore.ts";
import { localCampaignEnabled, localCampaignSubmissionAllowed } from "../src/lib/seat-campaign/requestPolicy.ts";

const at = "2026-11-01T00:00:00.000Z";
const input = { eventId: event.id, date: event.date, session: event.session, seatType: "arena" as const, block: "TEST A", row: "1", number: "11" };
const report = (extra: Partial<CampaignReport> = {}): CampaignReport => ({ ...input, id: randomUUID(), source: "self", status: "received", createdAt: at, ...extra });
const sum = (reports: CampaignReport[]) => summarizeCampaign(event, reports, at);
const root = path.resolve("research/seat-campaign-mvp-2026-11-01/tests", randomUUID());
const caseRoot = (name: string) => path.join(root, name);

test("local API stays disabled in production, public hosts and other ports", () => {
  assert.equal(localCampaignEnabled("development", "127.0.0.1:3142"), true);
  assert.equal(localCampaignEnabled("production", "127.0.0.1:3142"), false);
  for (const host of ["tixrepo.com", "127.0.0.1:3000", "127.0.0.1.attacker.test:3142", null]) assert.equal(localCampaignEnabled("development", host), false);
});
test("valid loopback submissions survive Next URL normalization but cross origins are rejected", () => {
  assert.equal(localCampaignSubmissionAllowed("127.0.0.1:3142", "http://127.0.0.1:3142", "application/json"), true);
  for (const origin of [null, "null", "https://attacker.test", "http://localhost:3142", "http://127.0.0.1:3142/path"]) assert.equal(localCampaignSubmissionAllowed("127.0.0.1:3142", origin, "application/json"), false);
  assert.equal(localCampaignSubmissionAllowed("127.0.0.1:3142", "http://127.0.0.1:3142", "text/plain"), false);
});

test("normalization accepts full-width ticket characters and leading zeros without changing block identity", () => {
  assert.deepEqual(parseSeatInput({ ...input, block: " ａ０１ ", row: "０１", number: "００１" }, event), { ...input, block: "A01", row: "1", number: "1" });
  assert.equal(parseSeatInput({ ...input, row: "aa", number: "１０～１９" }, event).number, "10-19");
});
test("event, date and session are each enforced", () => {
  for (const [key, value] of [["eventId", "another"], ["date", "2026-12-03"], ["session", "昼公演"]]) assert.throws(() => parseSeatInput({ ...input, [key]: value }, event), /一致/);
});
test("row ranges, zero, negative and malformed numbers cannot enter aggregation", () => {
  for (const row of ["1-20", "0", "A/B", "10000"]) assert.throws(() => parseSeatInput({ ...input, row }, event));
  for (const number of ["0", "20-10", "10-10", "-1", "12,13", "100000", "<script>"]) assert.throws(() => parseSeatInput({ ...input, number }, event));
});
test("sparse row 1 and 20 remain two reported rows, with no invented rows or number intervals", () => {
  const summary = sum([report(), report({ row: "20", number: "361" })]);
  assert.deepEqual(summary.rows.map(r => r.row), ["1", "20"]);
  assert.deepEqual(summary.rows.flatMap(r => r.numbers), ["11", "361"]);
  assert.equal(summary.selfLocations, 2);
});
test("number range is one range report and is not expanded to seats", () => {
  const summary = sum([report({ number: "10-19" })]);
  assert.equal(summary.selfLocations, 1);
  assert.deepEqual(summary.rows[0].numbers, ["10-19"]);
});
test("normalized duplicate locations are one group; submissions are not unique respondents", () => {
  const one = report();
  const summary = sum([one, one, report({ block: "ｔｅｓｔ　ａ", row: "01", number: "011" })]);
  assert.equal(summary.selfSubmissions, 2);
  assert.equal(summary.selfLocations, 1);
  assert.equal(summary.excluded, 1);
});
test("other performances, invalid seats and withdrawn/rejected entries are excluded", () => {
  const summary = sum([report({ date: "2026-12-03" }), report({ session: "昼" }), report({ eventId: "else" }), report({ row: "1-20" }), report({ status: "withdrawn" }), report({ status: "rejected" })]);
  assert.equal(summary.selfSubmissions, 0); assert.equal(summary.excluded, 6);
});
test("external sources require accepted provenance and never add to self counts", () => {
  const external = report({ source: "external", status: "accepted", originId: "original-public-post", sourceUrl: "https://example.org/source" });
  const summary = sum([external, { ...external, id: randomUUID() }, report({ source: "external" }), report({ source: "external", status: "accepted" })]);
  assert.equal(summary.selfSubmissions, 0); assert.equal(summary.externalLocations, 1); assert.equal(summary.rows.length, 0);
});
test("missing block requests require an explicit source inventory; no inventory means no invented names", () => {
  assert.deepEqual(sum([]).missingBlocks, []);
  const summary = summarizeCampaign(event, [report()], at, [
    { seatType: "arena", block: "test a", sourceUrl: "https://example.org/official" },
    { seatType: "arena", block: "TEST B", sourceUrl: "https://example.org/official" },
    { seatType: "arena", block: "GUESS", sourceUrl: "" },
  ]);
  assert.deepEqual(summary.missingBlocks.map(b => b.block), ["TEST B"]);
});
test("changes compare matching performance snapshots and distinguish additions/removals", () => {
  const before = sum([report()]), after = sum([report({ row: "20" })]);
  const baseline = { eventId: event.id, date: event.date, session: event.session, keys: before.keys, savedAt: at };
  assert.deepEqual(campaignChanges(after, baseline), { added: 1, removed: 1 });
  assert.equal(campaignChanges(after, { ...baseline, date: "2026-12-03" }), null);
  assert.equal(campaignChanges(after, null), null);
});
test("four drafts preserve zero/unconfirmed states and never invent increments or sparse ranges", () => {
  const drafts = campaignDrafts(sum([report(), report({ row: "20" })]), null, { form: "FORM", summary: "SUMMARY" }, true);
  assert.deepEqual(drafts.map(d => d.kind), ["募集開始", "途中速報", "追加募集", "更新報告"]);
  const text = drafts.map(d => d.text).join("\n");
  assert.match(text, /未公開/); assert.match(text, /1列/); assert.match(text, /20列/); assert.doesNotMatch(text, /1[〜～-]20列/);
  assert.match(text, /席がないことを示すものではありません/); assert.match(text, /増減はまだ表示しません/);
  assert.match(campaignDrafts(sum([]), null, { form: "FORM", summary: "SUMMARY" })[1].text, /まだ座席報告はありません/);
});
test("image pagination retains every sparse number with bounded readable lines", () => {
  const numbers = Array.from({ length: 70 }, (_, i) => String(1 + i * 17));
  const row = { key: "x", seatType: "stand" as const, block: "長".repeat(32), row: "9999", numbers };
  const chunks = campaignImageRows([row]);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every(lines => lines.length <= 2 && lines.every(line => imageTextUnits(line) <= 66)));
  const combined = chunks.map(lines => lines.join("")).join("\n");
  for (const number of numbers) assert.match(combined, new RegExp(`(?: / |・)${number}番`));
  assert.doesNotMatch(combined, /…|省略/);
});
test("durable local input roundtrip persists without production DB", async () => {
  const dir = caseRoot("roundtrip"), id = randomUUID();
  const empty = await readLocalCampaign(dir, event); assert.equal(empty.summary.selfSubmissions, 0);
  const saved = await saveLocalReport(dir, event, id, input); assert.equal(saved.id, id);
  const state = await readLocalCampaign(dir, event); assert.equal(state.summary.selfSubmissions, 1); assert.equal(state.summary.rows[0].row, "1");
});
test("simultaneous retry of the same submission is idempotent", async () => {
  const dir = caseRoot("retry"), id = randomUUID();
  const results = await Promise.all([saveLocalReport(dir, event, id, input), saveLocalReport(dir, event, id, input)]);
  assert.deepEqual(results.map(r => r.repeated).sort(), [false, true]);
  assert.equal((await readLocalCampaign(dir, event)).summary.selfSubmissions, 1);
});
test("conflicting reuse of submission id cannot overwrite the original", async () => {
  const dir = caseRoot("conflict"), id = randomUUID(); await saveLocalReport(dir, event, id, input);
  await assert.rejects(saveLocalReport(dir, event, id, { ...input, number: "999" }), /一致/);
  assert.deepEqual((await readLocalCampaign(dir, event)).summary.rows[0].numbers, ["11"]);
});
test("invalid/path-traversal submission ids cannot create report files", async () => {
  await assert.rejects(saveLocalReport(caseRoot("invalid"), event, "../outside", input), /送信ID/);
});
test("stale comparison cannot be saved and baseline snapshots are append only", async () => {
  const dir = caseRoot("baseline"), empty = await readLocalCampaign(dir, event);
  await saveLocalReport(dir, event, randomUUID(), input);
  await assert.rejects(saveLocalBaseline(dir, event, empty.summary.revision), /集計が変わっています/);
  let state = await readLocalCampaign(dir, event); await saveLocalBaseline(dir, event, state.summary.revision);
  await saveLocalReport(dir, event, randomUUID(), { ...input, row: "20" });
  state = await readLocalCampaign(dir, event); assert.deepEqual(campaignChanges(state.summary, state.baseline), { added: 1, removed: 0 });
  await saveLocalBaseline(dir, event, state.summary.revision);
  assert.equal((await fs.readdir(path.join(dir, "baselines"))).length, 2);
});
test("corrupt saved records fail closed instead of silently becoming zero reports", async () => {
  const dir = caseRoot("corrupt"), id = randomUUID(); await saveLocalReport(dir, event, id, input);
  await fs.writeFile(path.join(dir, "reports", `${randomUUID()}.json`), "{broken");
  await assert.rejects(readLocalCampaign(dir, event));
  assert.equal((JSON.parse(await fs.readFile(path.join(dir, "reports", `${id}.json`), "utf8"))).number, "11");
});
test("wrong-performance baseline is not treated as a valid change comparison", async () => {
  const dir = caseRoot("bad-baseline"); await readLocalCampaign(dir, event);
  await fs.mkdir(path.join(dir, "baselines"));
  await fs.writeFile(path.join(dir, "baselines", "bad.json"), JSON.stringify({ eventId: "other", date: event.date, session: event.session, keys: [], savedAt: at }));
  await assert.rejects(readLocalCampaign(dir, event), /比較の基準/);
});
