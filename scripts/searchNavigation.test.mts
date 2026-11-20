import assert from "node:assert/strict";
import test from "node:test";
import { getCommittedSearchUrl } from "../src/lib/searchQuery.ts";

test("opening or reconfirming the same search preserves the current history entry", () => {
  assert.equal(getCommittedSearchUrl("https://tixrepo.com/search", "　"), null);
  assert.equal(getCommittedSearchUrl("https://tixrepo.com/search?q=%E5%9F%8E%E3%83%9B", " 城ホ "), null);
});

test("a confirmed Japanese query round-trips with its filters, fragment and punctuation", () => {
  const target = getCommittedSearchUrl("https://tixrepo.com/search?from=venue&q=old#results", "  A&B 東京  ");
  assert.ok(target);
  assert.equal(target.searchParams.get("q"), "A&B 東京");
  assert.equal(target.searchParams.get("from"), "venue");
  assert.equal(target.hash, "#results");
  const cleared = getCommittedSearchUrl(target.href, "");
  assert.ok(cleared);
  assert.equal(cleared.href, "https://tixrepo.com/search?from=venue#results");
});
