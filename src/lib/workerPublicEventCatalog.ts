import {
  PUBLIC_CATALOG_ASSET,
  PUBLIC_CATALOG_CACHE_SECONDS,
  PUBLIC_CATALOG_KEY,
  PUBLIC_CATALOG_MAX_BYTES,
  readPublicEventCatalog,
  type PublicEventCatalog,
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
  collect: (previous: PublicEventCatalog | null) => Promise<{ catalog: { updatedAt: string; events: unknown[] }; json: string }>,
) {
  const previous = await store.head(PUBLIC_CATALOG_KEY);
  if (previous && previous.uploaded.getTime() >= scheduledTime) return { status: "already-current" };
  let previousCatalog: PublicEventCatalog | null = null;
  if (previous) {
    const object = await store.get(PUBLIC_CATALOG_KEY);
    if (!object || object.size > PUBLIC_CATALOG_MAX_BYTES) {
      await object?.body.cancel();
      throw new Error("Previous public catalog could not be compared");
    }
    previousCatalog = readPublicEventCatalog(await object.json());
  }
  const { catalog, json } = await collect(previousCatalog);
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
  if (!catalog || !catalog.venueActivity) {
    // Legacy R2 snapshots still supply the most recent event catalog. During the
    // rollout only, fill the missing venue dates from the verified build.
    try {
      const response = await assets.fetch(new Request(new URL(PUBLIC_CATALOG_ASSET, origin)));
      if (!response.ok) {
        await response.body?.cancel();
        if (!catalog) return null;
      } else {
        const built = readPublicEventCatalog(await response.json());
        catalog = catalog ? { ...catalog, venueActivity: built.venueActivity } : built;
      }
    } catch {
      if (!catalog) return null;
    }
  }
  if (cache) {
    const response = Response.json(catalog, { headers: { "Cache-Control": `public, max-age=${PUBLIC_CATALOG_CACHE_SECONDS}` } });
    ctx.waitUntil(cache.put(key, response).catch(() => console.warn({ kind: "public_catalog_cache_failed" })));
  }
  return catalog;
}
