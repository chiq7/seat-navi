import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { OFFICIAL_NEWS_CATEGORY_LABELS, type OfficialNews } from "../src/lib/types.ts";

function load<T>(path: string, deps: Record<string, unknown>): T {
  const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", source)((name: string) => { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; }, loaded, loaded.exports);
  return loaded.exports as T;
}
const { getOfficialNewsSummary } = load<typeof import("../src/lib/officialNews.ts")>("src/lib/officialNews.ts", {
  "@/lib/supabase/client": {}, "@/lib/artists": {}, "@/lib/types": { OFFICIAL_NEWS_CATEGORY_LABELS },
});
const news = (values: Partial<OfficialNews>) => values as OfficialNews;
test("serialized missing metadata is not rendered as a news fact", () => {
  assert.equal(getOfficialNewsSummary(news({ event_name: "null", tour_name: " UNDEFINED ", event_dates: ["null"], venue_names: ["undefined"], ticket_sale_start: "null", ticket_sale_end: "null" })), "公式サイトからのお知らせ");
});
test("valid metadata survives empty sentinels and uses the real tour fallback", () => {
  assert.equal(getOfficialNewsSummary(news({ event_name: "NULL", tour_name: " Live Tour ", event_dates: ["null", "2026-12-02"], venue_names: ["", "東京ドーム"], ticket_sale_start: "undefined", ticket_sale_end: "2026-11-10" })), "Live Tourに関する公式のお知らせ / 開催日: 2026-12-02 / 会場: 東京ドーム / 受付: 2026-11-10");
});
test("null substring in a genuine title is preserved", () => {
  assert.equal(getOfficialNewsSummary(news({ event_name: "Null World Tour" })), "Null World Tourに関する公式のお知らせ");
});
test("venue measurement sends only controlled route/outcome/category fields", () => {
  const sent: unknown[][] = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { pathname: "/venues/tokyo-dome" } } });
  try {
    const a = load<typeof import("../src/lib/venueAnalytics.ts")>("src/lib/venueAnalytics.ts", { "./analytics": { trackEvent: (...args: unknown[]) => sent.push(args) } });
    a.trackVenueSeatSearch("matched", 3.8);
    a.trackVenueSeatSearch("multiple", Infinity);
    a.trackVenueFacilityOpen("荷物", "場内");
    a.trackVenueFacilityOpen("private free text", "outside");
    a.trackVenueAccess("tokyo-dome", "local_map");
    a.trackVenueAccess("invalid?ticket=123", "official_map");
    assert.deepEqual(sent, [
      ["venue_seat_search", { venue_id: "tokyo-dome", result_type: "matched", result_count: 3 }],
      ["venue_seat_search", { venue_id: "tokyo-dome", result_type: "multiple", result_count: 0 }],
      ["venue_luggage_detail", { venue_id: "tokyo-dome", facility_category: "luggage", facility_scope: "inside" }],
      ["venue_access_open", { venue_id: "tokyo-dome", map_type: "local_map" }],
    ]);
  } finally { if (original) Object.defineProperty(globalThis, "window", original); else Reflect.deleteProperty(globalThis, "window"); }
});
