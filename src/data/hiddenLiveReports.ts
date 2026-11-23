/**
 * 現地レポ (after_reports) rows kept in the database but never shown on the site: owner's test posts.
 * Every public read of after_reports goes through these helpers; the rows stay for the owner to inspect.
 * 2026-11-23: YOASOBI TD Garden, 幾田りら ぴあアリーナMM, さいたまスーパーアリーナ (all owner tests), and
 * BE:FIRST 東京ドーム (same seat as the removed ad demo sample, so treated as a sample too).
 */
export const HIDDEN_LIVE_REPORT_IDS: readonly string[] = [
  "641fd724715944a89352",
  "e216a124802f470dbc2b",
  "eb68df2b4f0c4123b4dd",
  "9a80f501dd304cefa6a0",
];

const hidden = new Set(HIDDEN_LIVE_REPORT_IDS);

export function isHiddenLiveReport(id: string | null | undefined): boolean {
  return Boolean(id && hidden.has(id));
}

/** Adds `id not in (...)` to a Supabase query on after_reports. */
export function excludeHiddenLiveReports<Q>(query: Q): Q {
  if (!HIDDEN_LIVE_REPORT_IDS.length) return query;
  return (query as unknown as { not(column: string, operator: string, value: string): Q })
    .not("id", "in", `(${HIDDEN_LIVE_REPORT_IDS.join(",")})`);
}
