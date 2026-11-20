import assert from "node:assert/strict";
import test from "node:test";
import { getJstDateString, getUpcomingEvents, getPastEvents } from "../src/lib/artistPageData.ts";
import { upcomingHomePrograms } from "../src/lib/upcomingHomePrograms.ts";
import { collectEventModificationTimes, collectVenueActivity } from "../src/lib/venueActivity.ts";
import { readPublicDataSnapshot } from "../src/lib/publicDataSnapshot.ts";
import { readPublicEventCatalog } from "../src/lib/publicEventCatalog.ts";
import type { HomePrograms } from "../src/lib/publicPageData.ts";

const created = "2026-10-01T14:00:00.000Z";
const report = "2026-11-10T17:30:00.000Z";
const scanned = "2026-11-17T15:15:00.000Z";
const day = "2026-11-18";
const event = { id: "tokyo", title: "Autumn show", date: day, venue: "東京ドーム", venue_id: "tokyo-dome", genre: null, created_at: created };
const eventB = { ...event, id: "osaka", venue: "大阪城ホール", venue_id: "osaka-jo-hall" };

test("event lastmod changes for a real correction, persists through rescans and leaves unrelated dates alone", () => {
  const oldDates = collectEventModificationTimes([event,eventB], null, scanned);
  assert.deepEqual(oldDates,{tokyo:created,osaka:created});
  const changedEvent = {...event, title:"Winter show"};
  const edited = collectEventModificationTimes([changedEvent,eventB], {events:[event,eventB],eventModifiedAt:oldDates},scanned);
  assert.deepEqual(edited,{tokyo:scanned,osaka:created});
  assert.deepEqual(collectEventModificationTimes([changedEvent,eventB], {events:[changedEvent,eventB],eventModifiedAt:edited},
    "2026-12-01T00:00:00.000Z"),edited);
});

test("at midnight JST yesterday disappears from both the list and the multi-day card including its default link", () => {
  const before = getJstDateString(new Date("2026-11-17T14:59:59.999Z"));
  const after = getJstDateString(new Date("2026-11-17T15:00:00.000Z"));
  assert.equal(before, "2026-11-17");
  assert.equal(after, day);
  const performances = [{ ...event, id: "old", date: before }, event, { ...event, id: "next", date: "2026-11-19" }];
  const payload = { events: performances.map(e => ({id:e.id, dateIso:e.date})), discoveryCards: [{
    events: performances, selectedEventId: "old", lottery: {status:"reported",eventIds:["old","tokyo","next"]},
  }] } as HomePrograms;
  assert.equal(upcomingHomePrograms(payload, before).discoveryCards[0].selectedEventId, "old");
  const current = upcomingHomePrograms(payload, after);
  assert.deepEqual(current.events.map(e => e.id), ["tokyo","next"]);
  assert.deepEqual(current.discoveryCards[0].events.map(e => e.id), ["tokyo","next"]);
  assert.equal(current.discoveryCards[0].selectedEventId, "tokyo");
  assert.equal(current.discoveryCards[0].lottery, undefined);
  assert.deepEqual(getUpcomingEvents(performances, after).map(e=>e.id), ["tokyo","next"]);
  assert.deepEqual(getPastEvents(performances, after).map(e=>e.id), ["old"]);
});

test("initial and unchanged snapshots use only source creation or actual contribution times per venue", () => {
  const events = [event, eventB];
  const initial = collectVenueActivity(events, new Map([["tokyo",report],["unpublished",scanned]]), null, scanned);
  assert.deepEqual(initial, {"tokyo-dome":{updatedAt:report}, "osaka-jo-hall":{updatedAt:created}});
  assert.deepEqual(collectVenueActivity(events, new Map(), {events, venueActivity:initial}, scanned), initial);
  const emptyTime = collectVenueActivity([{...event, created_at: null}], new Map(), null, scanned);
  assert.deepEqual(emptyTime, {});
  const newer = "2026-11-18T09:00:00.000Z";
  const next = collectVenueActivity(events, new Map([["tokyo",newer]]), {events,venueActivity:initial}, newer);
  assert.deepEqual(next, {"tokyo-dome":{updatedAt:newer}, "osaka-jo-hall":{updatedAt:created}});
});

test("date correction, venue transfer and deletion identify only the affected venues and preserve source timestamps", () => {
  const events = [event, eventB];
  const venueActivity = collectVenueActivity(events,new Map(),null,scanned);
  const prior = {events, venueActivity};
  const changed = collectVenueActivity([{...event, date:"2026-11-19"},eventB],new Map(),prior,scanned);
  assert.deepEqual(changed["tokyo-dome"], {updatedAt:created, changeObservedAt:scanned});
  assert.deepEqual(changed["osaka-jo-hall"], {updatedAt:created});
  const moved = collectVenueActivity([{...event,venue:eventB.venue,venue_id:eventB.venue_id},eventB],new Map(),prior,scanned);
  assert.equal(moved["tokyo-dome"].changeObservedAt,scanned);
  assert.equal(moved["osaka-jo-hall"].changeObservedAt,scanned);
  const removed = collectVenueActivity([event],new Map(),prior,scanned);
  assert.deepEqual(removed["tokyo-dome"], {updatedAt:created});
  assert.deepEqual(removed["osaka-jo-hall"], {updatedAt:created, changeObservedAt:scanned});
});

test("previous R2 format and failure fallback retain dates independently of scan/build time", () => {
  const legacy = readPublicEventCatalog({version:1, updatedAt:scanned, events:[event], home:{events:[]}, feed:[]});
  assert.equal(legacy.venueActivity,undefined);
  const route = "/api/public/venue-programs/tokyo-dome";
  const old = {updatedAt:scanned,data:{today:"2026-11-16",events:[event]}};
  assert.deepEqual(readPublicDataSnapshot(route,old,new Date(scanned)).data, {today:day,events:[event]});
  const source = {updatedAt:scanned,data:{...old.data,activity:{updatedAt:report}}};
  const restored = readPublicDataSnapshot(route,source,new Date("2026-12-01T00:00:00Z"));
  assert.deepEqual(restored.data, {today:"2026-12-01",events:[event],activity:{updatedAt:report,changeObservedAt:undefined}});
});
