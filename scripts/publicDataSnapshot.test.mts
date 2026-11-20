import assert from "node:assert/strict";
import test from "node:test";
import { createPublicDataSnapshot, readPublicDataSnapshot } from "../src/lib/publicDataSnapshot.ts";
import { publicPageDataPaths as paths } from "../src/lib/publicPageData.ts";

const savedAt = "2026-11-09T14:58:00Z";
const afterMidnight = new Date("2026-11-09T15:01:00Z");

test("the public backup omits user reports and dated promotional examples", () => {
  const value = [
    { id: "member", source: "real", xHandle: "account", detail: "member comment" },
    { id: "supplemental-1", source: "editorial", detail: "明日公演" },
    { id: "sample-1", source: "sample" },
    { id: "official", source: "editorial", date: "2026-11-10", xHandle: null },
  ];
  const backup = createPublicDataSnapshot(paths.feed, value, savedAt);
  assert.deepEqual(readPublicDataSnapshot(paths.feed, backup, afterMidnight).data, [value[3]]);
  assert.deepEqual(readPublicDataSnapshot(paths.feed, backup, new Date("2026-11-10T14:58:00Z")).data, []);
});

test("JST midnight drops expired upcoming events and moves venue events to the past", () => {
  const upcoming = [{ dateIso: "2026-11-09" }, { dateIso: "2026-11-10" }];
  const backup = createPublicDataSnapshot(paths.upcoming, { events: upcoming, discoveryCards: [{}] }, savedAt);
  assert.deepEqual(readPublicDataSnapshot(paths.upcoming, backup, afterMidnight).data, {
    events: [upcoming[1]],
    discoveryCards: [],
  });
  const path = paths.venue + "zozo-marine";
  const events = [{ date: "2026-11-09" }];
  const venue = createPublicDataSnapshot(path, { events, today: "2026-11-09" }, savedAt);
  assert.deepEqual(readPublicDataSnapshot(path, venue, afterMidnight).data, { events, today: "2026-11-10" });
});

test("invalid upstream data cannot be used as a fallback", () => {
  assert.throws(() => createPublicDataSnapshot(paths.upcoming, { events: null }, savedAt));
  assert.throws(() => readPublicDataSnapshot(paths.feed, { updatedAt: "", data: [] }, afterMidnight));
});
