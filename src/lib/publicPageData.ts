import type { HomeFeedItem, UpcomingEvent } from "./homeData";
import type { SeatDiscoveryData } from "./seatDiscovery";
import type { CrawledEvent } from "./types";

export const STATIC_PUBLIC_PAGES = process.env.NEXT_PUBLIC_TIXREPO_STATIC_PAGES === "1";

export const publicPageRefreshSeconds = {
  venue: 300,
  upcoming: 300,
  feed: 60,
};

export const publicPageDataPaths = {
  venue: "/api/public/venue-programs/",
  upcoming: "/api/public/home-programs",
  feed: "/api/public/live-feed",
  events: "/api/public/event-catalog",
};

export type VenuePrograms = { events: CrawledEvent[] | null; today: string };
export type HomePrograms = { events: UpcomingEvent[]; discoveryCards: SeatDiscoveryData[] };
export type PublicFeed = HomeFeedItem[];

export function formatPublicDataTime(updatedAt: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAt));
}
