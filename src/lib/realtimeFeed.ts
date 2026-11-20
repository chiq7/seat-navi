import type { HomeFeedItem } from "./homeData";
import { isCurrentXSeatPost, isXSeatPostUrl } from "./external-seats/xSeatPosts";

/** Legacy snapshots may contain examples or generated countdowns. They are not updates. */
export function isPublishedFeedItem(item: HomeFeedItem): boolean {
  return item.source === "real" || item.source === "collection";
}

export function filterPublishedFeedItems(items: readonly HomeFeedItem[], now = Date.now()): HomeFeedItem[] {
  return items.filter(item => isPublishedFeedItem(item)
    && (!isXSeatPostUrl(item.sourceUrl) || isCurrentXSeatPost(item.createdAt, now)));
}
