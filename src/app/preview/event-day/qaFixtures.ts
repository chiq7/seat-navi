import { EVENT_DAY_OSAKA_EXAMPLE } from "@/data/eventDayOsakaExample";
import type { EventDaySummary } from "@/lib/eventDaySummary";

/** Development-only synthetic cases. Never used as editorial or published event information. */
export const EVENT_DAY_QA_CASES = ["missing", "no-deadlines", "no-map", "empty", "extended", "other"] as const;
export function getEventDayQaFixture(name: string): EventDaySummary | null {
  const day = structuredClone(EVENT_DAY_OSAKA_EXAMPLE);
  const unmapped = () => { day.venueMapId = null; day.booths = day.booths.map(b => ({ ...b, map: null })); };
  if (name === "missing") {
    day.open = null; day.start = null;
    day.booths = day.booths.map(b => ({ ...b, hours: null, place: null, conditions: null, preparation: null, map: null }));
    day.deadlines = day.deadlines.map(d => ({ ...d, time: null, note: "確認用：時刻未発表" }));
  } else if (name === "no-deadlines") day.deadlines = [];
  else if (name === "no-map") unmapped();
  else if (name === "empty") {
    unmapped(); day.booths = []; day.remoteActions = []; day.deadlines = []; day.activities = []; day.reminders = [];
  } else if (name === "extended") {
    day.artist = "検証専用の長いアーティスト名・途中で切り捨てない";
    day.tour = "検証専用の長い公演名・全項目の表示と折り返し確認";
    day.booths.push({ ...day.booths[0], id: "qa-extra", kind: "other", number: 5, map: null,
      label: "確認用の長い用事名・参加条件と準備物を確認する窓口",
      conditions: ["確認用：長い参加条件の全文が表示されることを確認します。".repeat(3)],
      preparation: ["確認用：必要な提示物と注意点を途中で切り捨てないことを確認します。".repeat(3)] });
  } else if (name === "other") {
    unmapped(); day.artist = "検証専用アーティスト"; day.venue = "検証専用の別会場";
    day.venueSlug = "qa-test-venue"; day.hashtags = ["#TestArtist", "#TestTour"];
  } else return null;
  day.id = `qa-${name}`; day.eventHref = undefined;
  return day;
}
