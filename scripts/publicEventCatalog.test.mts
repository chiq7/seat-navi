import assert from "node:assert/strict";
import test from "node:test";
import { isPublicEventCatalogStale, PUBLIC_CATALOG_KEY, readPublicEventCatalog } from "../src/lib/publicEventCatalog.ts";
import { refreshPublicEventCatalog } from "../src/lib/workerPublicEventCatalog.ts";

const updatedAt = "2026-11-10T00:30:00Z";
const newCatalog = { catalog: { updatedAt, events: [{ id: "new" }] }, json: '{"events":[{"id":"new"}]}' };
const previousCatalog = { version: 1, updatedAt, events: [{ id: "old", title: "previous", venue: "東京ドーム" }], home: { events: [] }, feed: [] };
const previousObject = () => ({ size: 200, body: new ReadableStream(), json: async () => previousCatalog });

test("a failed collection does not replace a previously published catalog", async () => {
  const store = {
    async get() { return previousObject(); },
    async head() { return { etag: "old", uploaded: new Date("2026-11-10T00:00:01Z") }; },
    async put() { assert.fail("An incomplete catalog must never be written"); },
  };
  await assert.rejects(refreshPublicEventCatalog(store, Date.parse(updatedAt), async () => {
    throw new Error("Simulated upstream failure");
  }), /upstream failure/);
});

test("a concurrent publication makes an older writer keep the current catalog", async () => {
  const store = {
    async get() { return previousObject(); },
    async head() { return { etag: "old", uploaded: new Date("2026-11-10T00:00:01Z") }; },
    async put(key: string, value: string, options: { onlyIf: Headers | { etagMatches: string } }) {
      assert.equal(key, PUBLIC_CATALOG_KEY);
      assert.equal(value, newCatalog.json);
      assert.deepEqual(options.onlyIf, { etagMatches: "old" });
      return null;
    },
  };
  assert.deepEqual(await refreshPublicEventCatalog(store, Date.parse(updatedAt), async () => newCatalog), { status: "raced" });
});

test("a catalog with missing or empty event data cannot be served as a successful update", () => {
  assert.throws(() => readPublicEventCatalog({ version: 1, updatedAt, events: [], home: { events: [] }, feed: [] }));
  assert.equal(isPublicEventCatalogStale(updatedAt, Date.parse("2026-11-10T01:14:59Z")), false);
  assert.equal(isPublicEventCatalogStale(updatedAt, Date.parse("2026-11-10T01:15:00Z")), true);
});

test("losing the previous snapshot aborts the scheduled comparison without publishing a false change date", async () => {
  const store = {
    async get() { throw new Error("Previous R2 object unavailable"); },
    async head() { return { etag: "old", uploaded: new Date("2026-11-10T00:00:01Z") }; },
    async put() { assert.fail("Old evidence must be preserved"); },
  };
  await assert.rejects(refreshPublicEventCatalog(store, Date.parse(updatedAt), async () => newCatalog), /Previous R2 object unavailable/);
});
