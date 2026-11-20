import type { MetadataRoute } from "next";
import { PRODUCTION_ORIGIN } from "./analyticsTraffic";

const SNAPSHOT_KEY = "sitemap.xml";
const CACHE_CONTROL = "public, max-age=300";
const XML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

function xmlValue(value: string | number) {
  return String(value).replace(/[&<>"']/g, character => XML_ENTITIES[character]);
}

export function serializeSitemap(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map(entry => new URL(entry.url));
  if (urls.length > 50_000 || urls.some(url => url.origin !== PRODUCTION_ORIGIN || url.username || url.password || url.hash)
    || new Set(urls.map(url => url.href)).size !== urls.length
    || !urls.some(url => url.pathname.startsWith("/events/"))) {
    throw new Error("The sitemap must contain unique canonical URLs and published events");
  }
  const urlRows = entries.map(({ url, lastModified, changeFrequency, priority }) => [
    "<url>",
    `  <loc>${xmlValue(url)}</loc>`,
    lastModified && `  <lastmod>${xmlValue(lastModified instanceof Date ? lastModified.toISOString() : lastModified)}</lastmod>`,
    changeFrequency && `  <changefreq>${changeFrequency}</changefreq>`,
    priority !== undefined && `  <priority>${priority}</priority>`,
    "</url>",
  ].filter(Boolean).join("\n"));
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urlRows, "</urlset>", ""].join("\n");
}

type SnapshotMetadata = { etag: string };

export interface SitemapSnapshotStore {
  getWithMetadata<T>(key: string, options: { type: "text"; cacheTtl: number }): Promise<{ value: string | null; metadata: T | null }>;
  put(key: string, value: string, options: { metadata: SnapshotMetadata }): Promise<void>;
}

export async function publishSitemapSnapshot(store: SitemapSnapshotStore, entries: MetadataRoute.Sitemap) {
  const xml = serializeSitemap(entries);
  const bytes = new TextEncoder().encode(xml);
  if (bytes.byteLength > 25 * 1024 * 1024) throw new Error("Sitemap exceeds the snapshot storage limit");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const etag = `"${Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("")}"`;
  const current = await store.getWithMetadata<SnapshotMetadata>(SNAPSHOT_KEY, { type: "text", cacheTtl: 30 });
  if (current.value && current.metadata?.etag === etag) return "unchanged";
  await store.put(SNAPSHOT_KEY, xml, { metadata: { etag } });
  return "updated";
}

export async function readSitemapSnapshot(request: Request, store: SitemapSnapshotStore): Promise<Response | null> {
  const { value, metadata } = await store.getWithMetadata<SnapshotMetadata>(SNAPSHOT_KEY, { type: "text", cacheTtl: 30 });
  if (!value || !metadata?.etag) return null;

  const headers = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": CACHE_CONTROL, ETag: metadata.etag };
  const validators = request.headers.get("if-none-match")?.split(",").map(value => value.trim().replace(/^W\//, ""));
  if (validators?.includes("*") || validators?.includes(metadata.etag)) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : value, { headers });
}
