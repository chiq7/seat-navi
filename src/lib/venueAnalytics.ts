"use client";
import { trackEvent } from "./analytics";

export type SeatSearchResult = "matched" | "multiple" | "area" | "unverified" | "empty" | "invalid";
// Only fixed route slugs and controlled outcomes are sent. Never pass ticket input or a full URL.
function venueId(explicit?: string): string | null {
  const id = explicit ?? (typeof window === "undefined" ? undefined : window.location.pathname.match(/^\/(?:venues|dev\/venue-guides)\/([a-z0-9-]+)\/?$/)?.[1]);
  return id && /^[a-z0-9-]{1,64}$/.test(id) ? id : null;
}
export function trackVenueSeatSearch(result: SeatSearchResult, count = 0) {
  const id=venueId();if(!id)return;
  trackEvent("venue_seat_search",{venue_id:id,result_type:result,result_count:Number.isFinite(count)?Math.max(0,Math.min(999,Math.floor(count))):0});
}
export function trackVenueFacilityOpen(purpose:string,scope:string,id?:string) {
  const venue=venueId(id);if(!venue)return;
  const categories:Record<string,string>={"トイレ":"toilet","荷物":"luggage","飲食":"food","赤ちゃん":"baby","案内":"help","AED":"aed",toilet:"toilet",locker:"luggage",food:"food",baby:"baby",help:"help",aed:"aed"};
  const category=categories[purpose];if(!category)return;
  trackEvent(category==="luggage"?"venue_luggage_detail":"venue_facility_detail",{venue_id:venue,facility_category:category,facility_scope:scope==="場内"||scope==="inside"?"inside":"outside"});
}
export function trackVenueAccess(id:string,mode:"local_map"|"official_map") {
  const venue=venueId(id);if(venue)trackEvent("venue_access_open",{venue_id:venue,map_type:mode});
}
