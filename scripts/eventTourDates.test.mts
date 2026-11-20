import { test } from "node:test";
import assert from "node:assert/strict";
import { eventTourDateLinks } from "../src/lib/eventTourDates.ts";
import type { CrawledEvent } from "../src/lib/types.ts";

const event: CrawledEvent = {
  id: "current", title: "Snow Man DOME TOUR 2026-2027 ALL SUITE", venue: "東京ドーム",
  venue_id: "tokyo-dome", artist_slug: "snow-man", date: "2026-11-26", genre: "other",
};
const row = (id: string, date: string, extra: Partial<CrawledEvent> = {}): CrawledEvent => ({ ...event, id, date, ...extra });

test("show nearest other tour dates in either direction and distinguish non-consecutive dates", () => {
  const result = eventTourDateLinks(event, [row("later","2026-12-03"), row("previous","2026-11-20"), row("tomorrow","2026-11-27"), event]);
  assert.deepEqual(result.map(x=>[x.id,x.label]), [["previous","前の日程（11/20）の座席・レポ"],["tomorrow","翌日（11/27）の座席・レポ"]]);
});

test("do not attach other artists, tours, unknown dates, generic or fixture titles", () => {
  const rows = [row("different-tour","2026-11-27",{title:"Snow Man DOME TOUR 2030"}),
    row("different-artist","2026-11-27",{artist_slug:"number-i"}),
    row("unconfirmed","2026-11-27",{title:event.title + " 日程未定"}),
    row("fixture","2026-11-27",{title:"【テストデータ】"+event.title}),row("same-day","2026-11-26")];
  assert.deepEqual(eventTourDateLinks(event,rows),[]);
  for(const title of ["Snow Man", "Snow Man LIVE"]) assert.deepEqual(eventTourDateLinks({...event,title},[row("other","2026-11-27",{title})]),[]);
});

test("keep distinct performances on the chosen day with venue and session on the link", () => {
  const result=eventTourDateLinks(event,[row("day","2026-11-27",{title:event.title+"（昼公演）"}),row("night","2026-11-27",{title:event.title+"（夜公演）"})]);
  assert.equal(result.length,2);assert.deepEqual(result.map(x=>x.detail),["東京ドーム・昼公演","東京ドーム・夜公演"]);
});
