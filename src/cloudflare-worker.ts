import app from "vinext/server/fetch-handler";
import { publicPageDataPaths, STATIC_PUBLIC_PAGES } from "@/lib/publicPageData";
import { publicDataSnapshotAsset, readPublicDataSnapshot } from "@/lib/publicDataSnapshot";
import { isPublicEventCatalogStale, PUBLIC_CATALOG_SCHEDULE, type PublicEventCatalog } from "@/lib/publicEventCatalog";
import { withPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import { collectPublicEventCatalog } from "@/lib/collectPublicEventCatalog";
import { loadPublicEventCatalog, refreshPublicEventCatalog } from "@/lib/workerPublicEventCatalog";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { staticPageAsset, staticPublicPages } from "@/lib/staticPublicPages";
import { publicPageDataRoute } from "@/lib/serverPublicPageData";
import { hasSupabaseSessionCookie } from "@/lib/supabase/sessionCookie";
import { publicNavigationLog } from "@/lib/navigationLog";
import { publishSitemapSnapshot, readSitemapSnapshot, type SitemapSnapshotStore } from "@/lib/sitemapSnapshot";

export * from "vinext/server/fetch-handler";

export const schedulePaths: Readonly<Record<string, string>> = {
  "0 2 * * 1": "/api/cron/fetch-events",
  "5 0 * * *": "/api/cron/fetch-external-seats",
};

type TixrepoEnv = Env & { CRON_SECRET?: string; TIXREPO_SITEMAP?: SitemapSnapshotStore; TIXREPO_PUBLIC_CATALOG?: R2Bucket };

function hasSession(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cookie = request.headers.get("cookie");
  return url && cookie && hasSupabaseSessionCookie(url, {
    has: name => cookie.split(/;\s*/).some(part => part.startsWith(`${name}=`)),
  });
}

async function publicPageSnapshot(request: Request, url: URL, assets: Env["ASSETS"]) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!staticPublicPages.includes(url.pathname) || (url.pathname === "/" && hasSession(request))) return null;
  const flight = request.headers.get("rsc") === "1"
    || request.headers.has("x-vinext-rsc")
    || request.headers.get("accept")?.includes("text/x-component");
  const asset = staticPageAsset(url.pathname, Boolean(flight));
  const snapshot = await assets.fetch(new Request(new URL(asset, url), {
    method: request.method,
  })).catch(() => null);
  if (!snapshot) return null;
  if (!snapshot.ok) {
    await snapshot.body?.cancel();
    return null;
  }
  const response = new Response(snapshot.body, snapshot);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Tixrepo-Page-Delivery", flight ? "static-rsc" : "static-html");
  return response;
}

async function servePublicPageData(
  request: Request,
  url: URL,
  route: NonNullable<ReturnType<typeof publicPageDataRoute>>,
  assets: Env["ASSETS"],
  version: string,
  ctx: ExecutionContext,
  readCatalog: () => Promise<PublicEventCatalog | null>,
) {
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET" } });
  const key = new Request(`${url.origin}${url.pathname}?release=${encodeURIComponent(version)}`);
  const cache = await caches.open("tixrepo-public-data").catch(() => undefined);
  const cached = await cache?.match(key).catch(() => undefined);
  let data = cached;
  if (!data) {
    try {
      const catalog = route.fromCatalog ? await readCatalog() : null;
      const payload = catalog && route.fromCatalog ? route.fromCatalog(catalog) : await route.load(AbortSignal.timeout(5_000));
      const refreshedAt = new Date();
      const dayMs = 86_400_000;
      const secondsUntilMidnight = Math.ceil((dayMs - (refreshedAt.getTime() + 32_400_000) % dayMs) / 1000);
      const ttl = Math.min(route.seconds, secondsUntilMidnight);
      data = Response.json(payload, { headers: {
        "Cache-Control": `public, max-age=${ttl}`,
        "X-Tixrepo-Data-Updated-At": catalog?.updatedAt ?? refreshedAt.toISOString(),
        ...(catalog && isPublicEventCatalogStale(catalog.updatedAt) ? { "X-Tixrepo-Data-Stale": "1" } : {}),
      } });
    } catch {
      console.warn(JSON.stringify({ message: "Public data refresh failed", path: url.pathname }));
      try {
        const catalog = route.fromCatalog ? null : await readCatalog();
        let value: unknown;
        if (catalog) {
          value = { updatedAt: catalog.updatedAt, data: url.pathname === publicPageDataPaths.feed ? catalog.feed : catalog.home };
        } else {
          const asset = await assets.fetch(new Request(new URL(publicDataSnapshotAsset(url.pathname), url)));
          if (!asset.ok) {
            await asset.body?.cancel();
            throw new Error("Public data snapshot is unavailable");
          }
          value = await asset.json();
        }
        const snapshot = readPublicDataSnapshot(url.pathname, value);
        data = Response.json(snapshot.data, { headers: {
          "Cache-Control": "public, max-age=30",
          "X-Tixrepo-Data-Stale": "1",
          "X-Tixrepo-Data-Updated-At": snapshot.updatedAt,
        } });
      } catch {
        return Response.json({ error: "temporarily_unavailable" }, {
          status: 503,
          headers: { "Cache-Control": "no-store", "Retry-After": "30" },
        });
      }
    }
    if (cache) ctx.waitUntil(cache.put(key, data.clone()).catch(() => console.warn("Public data cache write failed")));
  }
  const response = new Response(data.body, data);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Tixrepo-Data-Cache", cached ? "HIT" : "MISS");
  return response;
}

async function serveCatalog(
  request: Request,
  readCatalog: () => Promise<PublicEventCatalog | null>,
) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const catalog = await readCatalog();
  if (!catalog) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  const etag = `"catalog-${catalog.updatedAt}"`;
  const headers = {
    ETag: etag,
    "Cache-Control": "public, max-age=60",
    "X-Tixrepo-Data-Updated-At": catalog.updatedAt,
    ...(isPublicEventCatalogStale(catalog.updatedAt) ? { "X-Tixrepo-Data-Stale": "1" } : {}),
  };
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  if (request.method === "HEAD") return new Response(null, { headers });
  return Response.json({ events: catalog.events }, { headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/_tixrepo/")) return new Response(null, { status: 404 });
    const previewHost = url.hostname.endsWith(".workers.dev");
    const dataRoute = STATIC_PUBLIC_PAGES ? publicPageDataRoute(url.pathname) : null;
    const version = env.CF_VERSION_METADATA.id;
    let catalog: Promise<PublicEventCatalog | null> | undefined;
    const readCatalog = () => catalog ??= loadPublicEventCatalog(url.origin, version, env.ASSETS, env.TIXREPO_PUBLIC_CATALOG, ctx);
    let response: Response;
    if (url.pathname === "/sitemap.xml" && env.TIXREPO_SITEMAP && (request.method === "GET" || request.method === "HEAD")) {
      response = await readSitemapSnapshot(request, env.TIXREPO_SITEMAP).catch(() => {
        console.warn({ kind: "sitemap_read_failed" });
        return null;
      }) ?? await env.ASSETS.fetch(request);
    } else if (STATIC_PUBLIC_PAGES && url.pathname === publicPageDataPaths.events) {
      response = await serveCatalog(request, readCatalog);
    } else if (dataRoute) {
      response = await servePublicPageData(request, url, dataRoute, env.ASSETS, version, ctx, readCatalog);
    } else if (STATIC_PUBLIC_PAGES && staticPublicPages.includes(url.pathname)) {
      response = await publicPageSnapshot(request, url, env.ASSETS) ?? await app.fetch(request, env, ctx);
    } else if (url.pathname === "/opengraph-image" && (request.method === "GET" || request.method === "HEAD")) {
      const asset = new Request(new URL("/images/tixrepo-opengraph.png", url), request);
      const image = await env.ASSETS.fetch(asset);
      if (image.ok || image.status === 304) {
        response = new Response(image.body, image);
        response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
      } else {
        await image.body?.cancel();
        response = await app.fetch(request, env, ctx);
      }
    } else if (STATIC_PUBLIC_PAGES && url.pathname.startsWith("/events/")) {
      response = await withPublicEventCatalog(readCatalog, () => app.fetch(request, env, ctx));
    } else {
      response = await app.fetch(request, env, ctx);
    }
    if (!previewHost) {
      const navigation = publicNavigationLog(request, url, response);
      if (navigation) console.log(navigation);
      return response;
    }
    const preview = new Response(response.body, response);
    preview.headers.set("X-Robots-Tag", "noindex");
    return preview;
  },
  async scheduled(controller, env, ctx) {
    if (controller.cron === PUBLIC_CATALOG_SCHEDULE && env.TIXREPO_PUBLIC_CATALOG) {
      try {
        const result = await refreshPublicEventCatalog(env.TIXREPO_PUBLIC_CATALOG, controller.scheduledTime, () => {
          const signal = AbortSignal.timeout(20_000);
          const client = createSupabasePublicClient(signal);
          if (!client) throw new Error("Public catalog reader is unavailable");
          return collectPublicEventCatalog(client, signal);
        });
        console.log({ kind: "public_catalog_refresh", ...result });
      } catch {
        console.warn({ kind: "public_catalog_refresh", status: "failed" });
        throw new Error("Public catalog refresh failed");
      }
      return;
    }
    const path = schedulePaths[controller.cron];
    if (!path || !env.CRON_SECRET) {
      throw new Error("The scheduled job or its authentication is missing");
    }
    const request = new Request(`https://tixrepo.com${path}`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const response: Response = await app.fetch(request, env, ctx);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`${path} returned HTTP ${response.status}`);
    }
    const result = await response.json() as {
      processed?: number;
      totalSaved?: number;
      failed?: string[];
      results?: Array<{ status?: string; accepted?: number }>;
    };
    const failed = result.failed?.length ?? result.results?.filter(row => row.status === "error").length ?? 0;
    let sitemap = "unconfigured";
    if (env.TIXREPO_SITEMAP) {
      try {
        const { getSitemapEntries } = await import("@/lib/sitemap");
        const { getCachedSeoEvent } = await import("@/lib/seoData");
        sitemap = await publishSitemapSnapshot(env.TIXREPO_SITEMAP, await getSitemapEntries(getCachedSeoEvent));
      } catch {
        sitemap = "failed";
      }
    }
    console.log({
      kind: "collection_summary",
      job: path,
      failed,
      processed: result.processed ?? null,
      saved: result.totalSaved ?? result.results?.reduce((count, row) => count + (row.accepted ?? 0), 0) ?? 0,
      skipped: result.results?.filter(row => row.status === "skipped").length ?? null,
      sitemap,
    });
    if (failed > 0 || sitemap === "failed") throw new Error(`${path} failed sources: ${failed}; sitemap: ${sitemap}`);
  },
} satisfies ExportedHandler<TixrepoEnv>;
