"use client";
import { trackEvent } from "./analytics";

export type SeatSearchResult = "matched" | "multiple" | "area" | "unverified" | "empty" | "invalid";
// Only fixed route slugs and controlled outcomes are sent. Never pass ticket input or a full URL.
function venueId(explicit?: string): string | null {
  const id = explicit ?? (typeof window === "undefined" ? undefined : window.location.pathname.match(/^\/(?:venues|dev\/venue-guides)\/([a-z0-9-]+)\/?$/)?.[1]);
  return id && /^[a-z0-9-]{1,64}$/.test(id) ? id : null;
}
/** `fields`: which boxes of the one-line ticket form were filled ("place", "seat", "place_seat", "none"). */
export function trackVenueSeatSearch(result: SeatSearchResult, count = 0, fields?: string) {
  const id=venueId();if(!id)return;
  trackEvent("venue_seat_search",{venue_id:id,result_type:result,result_count:Number.isFinite(count)?Math.max(0,Math.min(999,Math.floor(count))):0,...(fields?{search_fields:fields}:{})});
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
export function trackVenueSeatPhotoShareClick(id:string, placement:"photo_unlock"|"photo_viewer") {
  const venue=venueId(id);
  if(venue)trackEvent("venue_seat_photo_share_click",{venue_id:venue,placement,share_destination:"x"});
}
/** A seat block chosen on the map ("map"), by the seat search ("search") or with 前の区画/次の区画 ("step"). */
export function trackVenueSeatSectionSelect(source:"map"|"search"|"step", hasPhoto:boolean, ui:"card"|"sheet") {
  const id=venueId();if(id)trackEvent("venue_seat_section_select",{venue_id:id,select_source:source,has_photo:hasPhoto,seat_ui:ui});
}
/** A seat photo shown: the old photo card's viewer ("card") or the full-screen map's photo board ("sheet"). */
export function trackVenueSeatPhotoOpen(ui:"card"|"sheet", count:number) {
  const id=venueId();if(id)trackEvent("venue_seat_photo_open",{venue_id:id,seat_ui:ui,photo_count:Number.isFinite(count)?Math.max(0,Math.min(999,Math.floor(count))):0});
}
/** "この席を送る": which way the seat was sent. */
export function trackVenueSeatShare(destination:"line"|"x"|"copy"|"native") {
  const id=venueId();if(id)trackEvent("venue_seat_share",{venue_id:id,share_destination:destination});
}
