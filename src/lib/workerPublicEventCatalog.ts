import {
  PUBLIC_CATALOG_ASSET,
  PUBLIC_CATALOG_CACHE_SECONDS,
  PUBLIC_CATALOG_KEY,
  PUBLIC_CATALOG_MAX_BYTES,
  readPublicEventCatalog,
} from "./publicEventCatalog";

type CatalogStore = {
  get(key: string): Promise<{ size: number; body: ReadableStream; json(): Promise<unknown> } | null>;
  head(key: string): Promise<{ uploaded: Date; etag: string } | null>;
  put(key: string, json: string, options: {
    onlyIf: Headers | { etagMatches: string };
    httpMetadata: { contentType: string };
    customMetadata: { updatedAt: string };
  }): Promise<{ etag: string } | null>;
};

export async function refreshPublicEventCatalog(
  store: CatalogStore,
  scheduledTime: number,
  collect: () => Promise<{ catalog: { updatedAt: string; events: unknown[] }; json: string }>,
) {
  const previous = await store.head(PUBLIC_CATALOG_KEY);
  if (previous && previous.uploaded.getTime() >= scheduledTime) return { status: "already-current" };
  const { catalog, json } = await collect();
  const onlyIf = previous ? { etagMatches: previous.etag } : new Headers({ "If-None-Match": "*" });
  const result = await store.put(PUBLIC_CATALOG_KEY, json, {
    onlyIf,
    httpMetadata: { contentType: "application/json" },
    customMetadata: { updatedAt: catalog.updatedAt },
  });
  return result ? { status: "updated", updatedAt: catalog.updatedAt, events: catalog.events.length } : { status: "raced" };
}

export async function loadPublicEventCatalog(
  origin: string,
  version: string,
  assets: { fetch(request: Request): Promise<Response> },
  store: CatalogStore | undefined,
  ctx: { waitUntil(promise: Promise<unknown>): void },
) {
  const key = new Request(`${origin}${PUBLIC_CATALOG_ASSET}?release=${encodeURIComponent(version)}`);
  const cache = await caches.open("tixrepo-public-catalog").catch(() => undefined);
  const cached = await cache?.match(key).catch(() => undefined);
  if (cached) {
    try {
      return readPublicEventCatalog(await cached.json());
    } catch {
      // Re-read durable storage on an invalid cached copy.
    }
  }
  let catalog;
  if (store) {
    try {
      const object = await store.get(PUBLIC_CATALOG_KEY);
      if (object && object.size <= PUBLIC_CATALOG_MAX_BYTES) catalog = readPublicEventCatalog(await object.json());
      else await object?.body.cancel();
    } catch {
      console.warn({ kind: "public_catalog_r2_read_failed" });
    }
  }
  if (!catalog) {
    try {
      const response = await assets.fetch(new Request(new URL(PUBLIC_CATALOG_ASSET, origin)));
      if (!response.ok) {
        await response.body?.cancel();
        return null;
      }
      catalog = readPublicEventCatalog(await response.json());
    } catch {
      return null;
    }
  }
  if (cache) {
    const response = Response.json(catalog, { headers: { "Cache-Control": `public, max-age=${PUBLIC_CATALOG_CACHE_SECONDS}` } });
    ctx.waitUntil(cache.put(key, response).catch(() => console.warn({ kind: "public_catalog_cache_failed" })));
  }
  return catalog;
}
