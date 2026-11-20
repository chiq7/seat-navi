import type { CrawledEvent } from "./types";
import type { HomePrograms, PublicFeed } from "./publicPageData";

export const PUBLIC_CATALOG_SCHEDULE = "*/30 * * * *";
export const PUBLIC_CATALOG_KEY = "public/v1/catalog.json";
export const PUBLIC_CATALOG_ASSET = "/_tixrepo/data/catalog-v1.json";
export const PUBLIC_CATALOG_MAX_BYTES = 2 * 1024 * 1024;
export const PUBLIC_CATALOG_CACHE_SECONDS = 60;
export const PUBLIC_CATALOG_STALE_MS = 45 * 60 * 1000;

export type PublicEventCatalog = {
  version: 1;
  updatedAt: string;
  events: CrawledEvent[];
  home: HomePrograms;
  feed: PublicFeed;
};

export function readPublicEventCatalog(value: unknown): PublicEventCatalog {
  const catalog = value as Partial<PublicEventCatalog> | null;
  if (catalog?.version !== 1 || typeof catalog.updatedAt !== "string" || !Number.isFinite(Date.parse(catalog.updatedAt))
    || !Array.isArray(catalog.events) || catalog.events.length === 0
    || !Array.isArray(catalog.home?.events) || !Array.isArray(catalog.feed)) {
    throw new Error("Public event catalog is incomplete");
  }
  return catalog as PublicEventCatalog;
}

export function isPublicEventCatalogStale(updatedAt: string, now = Date.now()) {
  return now - Date.parse(updatedAt) >= PUBLIC_CATALOG_STALE_MS;
}
