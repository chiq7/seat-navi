import { writeFile } from "node:fs/promises";
import { supabase } from "../src/lib/supabase/client.ts";
import { getCachedSeoEvent, getSeoSitemapData } from "../src/lib/seoData.ts";
import { getSitemapEntries } from "../src/lib/sitemap.ts";
import { readEventContributions } from "../src/lib/eventIndexContent.ts";
import { readSupabasePages } from "../src/lib/supabase/readPages.ts";
import { dedupeVenueEventsForDisplay, getSamePerformanceEventIds } from "../src/lib/eventDisplay.ts";
import { isTestEvent } from "../src/lib/seoData.ts";
import { ARTISTS } from "../src/lib/artists.ts";
import type { CrawledEvent } from "../src/lib/types.ts";
const result = await getSeoSitemapData();
const all = await readSupabasePages<CrawledEvent>((a,b)=>supabase.from("events").select("id,title,venue,venue_id,date,artist_slug,genre",{count:"exact"}).order("id").range(a,b));
if(all.error||all.limited)throw Error("Event listing incomplete");
const visible=all.data.filter(e=>!isTestEvent(e)), events=dedupeVenueEventsForDisplay(visible);
const eligible=new Set(result.events.map(e=>e.id));
const samples=[];
for (const expected of [false, true]) {
  for(const e of events.filter(e=>eligible.has(e.id)===expected).slice(0,3)) {
    const ids=getSamePerformanceEventIds(visible,e);
    const actual=(await readEventContributions(supabase,ids)).latest.size>0;
    if(actual!==expected)throw Error("Page and sitemap disagree: "+e.id);
    samples.push({path:"/events/"+e.id,index:actual});
  }
}
const artists=ARTISTS.filter(a=>a.slug!=="test");
for(const [page,rows] of [["news",result.newsArtists],["setlist",result.setlistArtists],["after-reports",result.afterReportArtists]] as const) {
  const found=new Set(rows.map(a=>a.slug));
  for(const index of [false,true]) {
    const artist=artists.find(a=>found.has(a.slug)===index);
    if(artist)samples.push({path:"/artists/"+artist.slug+"/"+page,index});
  }
}
const entries=await getSitemapEntries(getCachedSeoEvent);
const data={at:new Date().toISOString(),publicEvents:events.length,eligibleEvents:eligible.size,emptyEvents:events.length-eligible.size,artists:artists.length,newsArtists:result.newsArtists.length,setlistArtists:result.setlistArtists.length,afterReportArtists:result.afterReportArtists.length,standaloneSetlists:result.setlistEvents.length,sitemapUrls:entries.length,samples};
console.log(JSON.stringify(data));
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(data,null,2)+"\n");
