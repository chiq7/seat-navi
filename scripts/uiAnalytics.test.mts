import assert from "node:assert/strict";
import test from "node:test";
import { pageTypeOf, UI_TARGETS } from "../src/lib/uiAnalytics.ts";

test("button presses are sent with fixed names and a page type only", () => {
  assert.equal(pageTypeOf("/venues/k-arena"), "venue");
  assert.equal(pageTypeOf("/events/abc"), "event");
  assert.equal(pageTypeOf("/"), "home");
  assert.equal(pageTypeOf("/s/k-arena/x"), "share");
  for (const [, name] of UI_TARGETS) assert.match(name, /^[a-z0-9_]{1,40}$/);
  assert.equal(new Set(UI_TARGETS.map(([selector]) => selector)).size, UI_TARGETS.length);
});
