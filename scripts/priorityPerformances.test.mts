import assert from "node:assert/strict";
import test from "node:test";
import { PRIORITY_PERFORMANCES, matchPriorityPerformance } from "../src/data/priorityPerformances.ts";
import { findArtistBySlug, findArtistMatches } from "../src/lib/artists.ts";
const base = {title:"Number_i LIVE TOUR No.Ⅲ", date:"2027-01-10",venue_id:"vantelin-dome",artist_slug:"number-i"};
test("official title variants preserve the two sessions without inventing a single session",()=>{
 assert.deepEqual(matchPriorityPerformance(base)?.starts,["12:30","19:00"]);
 assert.equal(PRIORITY_PERFORMANCES.filter(p=>p.artist==="number-i"&&p.date===base.date).length,1);
});
test("same date at another venue, artist, tour, or no artist cannot receive the guide",()=>{
 for(const change of [{venue_id:"tokyo-dome"},{artist_slug:"hana"},{title:"Number_i FAN MEETING"},{date:"2027-01-12"},{artist_slug:null}]) assert.equal(matchPriorityPerformance({...base,...change}),undefined);
});
test("HANA exact event and catalog boundary",()=>{
 assert.equal(findArtistBySlug("hana")?.name,"HANA");
 assert.equal(findArtistMatches("HANABI LIVE").some(m=>m.artist.slug==="hana"),false);
 const day=PRIORITY_PERFORMANCES.find(p=>p.artist==="hana")!;
 assert.equal(matchPriorityPerformance({title:day.title,date:day.date,venue_id:day.venueId,artist_slug:"hana"}),day);
 assert.equal(matchPriorityPerformance({title:"HANA",date:day.date,venue_id:day.venueId,artist_slug:"hana"}),undefined);
});
