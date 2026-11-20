import { FILTERED_SITEMAP_ASSET } from "./sitemapXml";

export const SITEMAP_SNAPSHOT_KEY = "public/v2/content-sitemap.xml";

type Snapshot = { etag: string; customMetadata?: Record<string, string> };
type Store = {
  head(key: string): Promise<Snapshot | null>;
  get(key: string): Promise<(Snapshot & { body: ReadableStream; text(): Promise<string> }) | null>;
  put(key: string, xml: string, options: { onlyIf: Headers | { etagMatches: string };
    httpMetadata: { contentType: string }; customMetadata: Record<string, string> }): Promise<Snapshot | null>;
};
type Assets = { fetch(request: Request): Promise<Response> };
type CreateSitemap = () => Promise<string>;

async function etag(xml: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(xml));
  return '"' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("") + '"';
}

export async function publishCatalogSitemap(store: Store, xml: string, updatedAt: string, workerVersion: string) {
  const previous = await store.head(SITEMAP_SNAPSHOT_KEY);
  if ((previous?.customMetadata?.catalogUpdatedAt ?? "") > updatedAt) return { status: "newer-exists" };
  const hash = await etag(xml);
  if (previous?.customMetadata?.sha256 === hash && previous.customMetadata.workerVersion === workerVersion) return { status: "unchanged" };
  const saved = await store.put(SITEMAP_SNAPSHOT_KEY, xml, {
    onlyIf: previous ? { etagMatches: previous.etag } : new Headers({ "If-None-Match": "*" }),
    httpMetadata: { contentType: "application/xml; charset=utf-8" },
    customMetadata: { sha256: hash, catalogUpdatedAt: updatedAt, workerVersion },
  });
  return { status: saved ? "updated" : "raced" };
}

export async function fallbackSitemap(store: Store | undefined, assets: Assets, version: string): Promise<string | null> {
  try {
    const snapshot = await store?.get(SITEMAP_SNAPSHOT_KEY);
    if (snapshot?.customMetadata?.workerVersion === version) return await snapshot.text();
    await snapshot?.body.cancel();
  } catch { /* The release also carries a filtered copy for storage outages. */ }
  try {
    const asset = await assets.fetch(new Request("https://tixrepo.com" + FILTERED_SITEMAP_ASSET));
    if (!asset.ok) { await asset.body?.cancel(); return null; }
    const xml = await asset.text();
    return xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">') && xml.includes("</urlset>") ? xml : null;
  } catch { return null; }
}

export function sitemapHasEvent(xml: string, id: string) {
  return xml.includes("<loc>https://tixrepo.com/events/" + encodeURIComponent(id) + "</loc>");
}

export async function serveCatalogSitemap(request: Request, generate: CreateSitemap, fallback: () => Promise<string | null>) {
  let xml: string | null;
  let stale = false;
  try { xml = await generate(); }
  catch { xml = await fallback(); stale = true; }
  if (xml === null) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  const headers = new Headers({ "Content-Type": "application/xml; charset=utf-8", ETag: await etag(xml),
    "Cache-Control": stale ? "no-store" : "public, max-age=0, must-revalidate" });
  if (stale) headers.set("X-Tixrepo-Data-Stale", "1");
  if (request.headers.get("If-None-Match") === headers.get("ETag")) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : xml, { headers });
}
