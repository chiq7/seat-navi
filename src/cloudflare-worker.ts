import app from "vinext/server/fetch-handler";
import { createClient } from "@supabase/supabase-js";
import { publicPageDataPaths, STATIC_PUBLIC_PAGES } from "@/lib/publicPageData";
import { filterPublishedFeedItems } from "@/lib/realtimeFeed";
import type { HomeFeedItem } from "@/lib/homeData";
import { publicDataSnapshotAsset, readPublicDataSnapshot } from "@/lib/publicDataSnapshot";
import { isPublicEventCatalogStale, PUBLIC_CATALOG_SCHEDULE, type PublicEventCatalog } from "@/lib/publicEventCatalog";
import { withPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import { collectPublicEventCatalog } from "@/lib/collectPublicEventCatalog";
import { latestRealTime } from "@/lib/venueActivity";
import type { readEventContributions } from "@/lib/eventIndexContent";
import { loadPublicEventCatalog, refreshPublicEventCatalog } from "@/lib/workerPublicEventCatalog";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { staticArtistPages, staticPageAsset, staticPublicPages } from "@/lib/staticPublicPages";
import { isFlightRequest, isLocalPageCapture, servePublicGuidePage } from "@/lib/workerPublicGuidePage";
import { PUBLIC_VENUE_GUIDE_IDS } from "@/lib/publicVenueGuides";
import { publicPageDataRoute } from "@/lib/serverPublicPageData";
import { hasSupabaseSessionCookie } from "@/lib/supabase/sessionCookie";
import { SEAT_RESALE_OPENING_SCHEDULE } from "@/lib/external-seats/sourcePolicy";
import { dedupeVenueEventsForDisplay } from "@/lib/eventDisplay";
import { fallbackSitemap, publishCatalogSitemap, serveCatalogSitemap, sitemapHasEvent } from "@/lib/eventCatalogSitemap";
import { getSitemapEntries } from "@/lib/sitemap";
import { sitemapXml } from "@/lib/sitemapXml";
import { queryEventWithArtist } from "@/lib/og/eventOgData";
import { getReportOgInfo, withPublicReport } from "@/lib/og/reportOgData";
import { isTestEvent } from "@/lib/seoData";
import { submitIndexNowUrls } from "@/lib/indexNow";
import { eventDateInJapan } from "@/lib/officialVenueEvents";
import { collectOfficialEvents } from "@/lib/workerOfficialEventCollection";
import { EVENT_AI_MODEL, OFFICIAL_EVENT_KICKOFF_SCHEDULE, OFFICIAL_EVENT_SCHEDULE } from "@/lib/workersAiEvents";

export * from "vinext/server/fetch-handler";

const guidePaths = new Set([...staticArtistPages, ...PUBLIC_VENUE_GUIDE_IDS.map(id => `/venues/${id}`)]);

export const schedulePaths: Readonly<Record<string, string>> = {
  "5 0 * * *": "/api/cron/fetch-external-seats",
  [SEAT_RESALE_OPENING_SCHEDULE]: "/api/cron/fetch-external-seats",
};

type TixrepoEnv = Env & {
  CRON_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  TIXREPO_PUBLIC_CATALOG?: R2Bucket;
  TIXREPO_EVENT_KICKOFF_UNTIL?: string;
  TIXREPO_EVENT_KICKOFF_RETRY?: string;
  AI?: Ai;
};

async function currentSitemap(contributions?: Awaited<ReturnType<typeof readEventContributions>>, catalog?: PublicEventCatalog | null) {
  const client = createSupabasePublicClient(AbortSignal.timeout(15_000));
  if (!client) throw new Error("Sitemap reader unavailable");
  return sitemapXml(await getSitemapEntries(async id => {
    const info = await queryEventWithArtist(client, id);
    return info && !isTestEvent(info.event) ? info : null;
  }, client, contributions, catalog));
}

async function updatePublicCatalog(store: R2Bucket, scheduledAt: number, workerVersion: string) {
  let snapshot: PublicEventCatalog | undefined;
  let contributions: Awaited<ReturnType<typeof readEventContributions>> | undefined;
  const refresh = await refreshPublicEventCatalog(store, scheduledAt, async previous => {
    const signal = AbortSignal.timeout(20_000);
    const client = createSupabasePublicClient(signal);
    if (!client) throw new Error("Public catalog reader is unavailable");
    const collected = await collectPublicEventCatalog(client, signal, previous);
    contributions = collected.contributions;
    snapshot = collected.catalog;
    return collected;
  });
  let xml: string | null = null;
  let sitemap = null;
  if (snapshot && refresh.status === "updated") {
    try {
      xml = await currentSitemap(contributions, snapshot);
      sitemap = await publishCatalogSitemap(store, xml, snapshot.updatedAt, workerVersion);
    } catch { sitemap = { status: "failed" }; }
  }
  return { refresh, sitemap, snapshot, xml };
}

async function runOfficialEventCollection(env: TixrepoEnv, scheduledAt: number, kickoff: boolean) {
  const { AI: ai, TIXREPO_PUBLIC_CATALOG: store, SUPABASE_SERVICE_ROLE_KEY: key } = env;
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!ai || !store || !key || !databaseUrl) throw new Error("The event collection bindings are incomplete");
  const startedAt = new Date().toISOString();
  const scheduledTime = new Date(scheduledAt);
  const day = eventDateInJapan(scheduledTime);
  const retry = kickoff && env.TIXREPO_EVENT_KICKOFF_RETRY === "1";
  const receiptKey = "operations/event-collection/" + day + (retry ? "-retry" : "") + ".json";
  const lease = await store.put(receiptKey, JSON.stringify({ state: "running", startedAt }), {
    onlyIf: new Headers({ "If-None-Match": "*" }),
    httpMetadata: { contentType: "application/json" },
  });
  if (!lease) return;

  let collection: Awaited<ReturnType<typeof collectOfficialEvents>> | undefined;
  let publication;
  let error: string | null = null;
  try {
    const database = createClient(databaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
    collection = await collectOfficialEvents(database, input => ai.run(EVENT_AI_MODEL, input), scheduledTime);
    if (!collection.sources.some(source => source.status === "ok")) throw new Error("No official schedule was read");
    if (collection.inserted.length) {
      const { refresh, sitemap, snapshot, xml } = await updatePublicCatalog(store, Date.now(), env.CF_VERSION_METADATA.id);
      const canonical = new Set(dedupeVenueEventsForDisplay(snapshot?.events ?? []).map(event => event.id));
      const published = collection.inserted.filter(event => canonical.has(event.id));
      const urls = published.filter(event => xml && sitemapHasEvent(xml, event.id)).map(event => "https://tixrepo.com/events/" + event.id);
      const indexNow = await submitIndexNowUrls(urls);
      publication = { refresh, sitemap, published: published.length, indexable: urls.length, indexNow };
      if (published.length !== collection.inserted.length || !sitemap || sitemap.status === "failed") {
        throw new Error("Saved events are awaiting complete public catalog and sitemap refresh");
      }
    }
  } catch (reason) {
    error = reason instanceof Error ? reason.message.slice(0, 240) : "Official event collection failed";
  }
  const failedSources = collection?.sources.filter(source => source.status === "failed").length ?? 0;
  const state = error ? "failed" : failedSources || collection?.databaseFailures.length ? "partial" : "completed";
  const receipt = { state, scheduledAt: scheduledTime.toISOString(), startedAt, finishedAt: new Date().toISOString(), collection, publication, error };
  const saved = await store.put(receiptKey, JSON.stringify(receipt), {
    onlyIf: { etagMatches: lease.etag }, httpMetadata: { contentType: "application/json" },
  });
  if (!saved) throw new Error("Could not save the official event collection receipt");
  console.log({ kind: "official_event_collection", state, day, failedSources, inserted: collection?.inserted.length ?? 0 });
  if (error) throw new Error(error);
}

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
  const flight = isFlightRequest(request);
  const asset = staticPageAsset(url.pathname, flight);
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
  const searchTerm = url.pathname === "/search" && !flight && request.method === "GET" ? url.searchParams.get("q") : null;
  if (searchTerm) {
    response.headers.delete("ETag");
    response.headers.delete("Content-Length");
    return new HTMLRewriter().on("input#site-search", {
      element(input) {
        // HTMLRewriter quotes attribute values; preserve literal ampersands as text.
        input.setAttribute("value", searchTerm.replaceAll("&", "&amp;"));
      },
    }).transform(response);
  }
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
      const loaded = catalog && route.fromCatalog ? route.fromCatalog(catalog) : await route.load(AbortSignal.timeout(5_000));
      const payload = url.pathname === publicPageDataPaths.feed
        ? filterPublishedFeedItems(loaded as HomeFeedItem[])
        : loaded;
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
        const payload = url.pathname === publicPageDataPaths.feed
          ? filterPublishedFeedItems(snapshot.data as HomeFeedItem[])
          : snapshot.data;
        data = Response.json(payload, { headers: {
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
    if (/^\/setlist-archive\/[a-z0-9][a-z0-9-]*\.json$/.test(url.pathname) && (request.method === "GET" || request.method === "HEAD")) {
      const asset = new URL("/_tixrepo" + url.pathname, url);
      response = await env.ASSETS.fetch(new Request(asset, request));
    } else if (url.pathname === "/sitemap.xml" && (request.method === "GET" || request.method === "HEAD")) {
      response = await serveCatalogSitemap(request, async () => currentSitemap(undefined, await readCatalog()), () => fallbackSitemap(env.TIXREPO_PUBLIC_CATALOG, env.ASSETS, version));
    } else if (STATIC_PUBLIC_PAGES && url.pathname === publicPageDataPaths.events) {
      response = await serveCatalog(request, readCatalog);
    } else if (dataRoute) {
      response = await servePublicPageData(request, url, dataRoute, env.ASSETS, version, ctx, readCatalog);
    } else if (STATIC_PUBLIC_PAGES && isLocalPageCapture(request, url)
      && (guidePaths.has(url.pathname) || staticPublicPages.includes(url.pathname))) {
      response = await withPublicEventCatalog(readCatalog, () => app.fetch(request, env, ctx));
    } else if (STATIC_PUBLIC_PAGES && (url.pathname === "/" || guidePaths.has(url.pathname))) {
      response = await servePublicGuidePage(request, {
        assets: env.ASSETS, cache: () => caches.open("tixrepo-public-guides"),
        release: version, hasSession: Boolean(hasSession(request)),
        venueLastChange: async id => {
          const activity = (await readCatalog())?.venueActivity?.[id];
          return latestRealTime(activity?.updatedAt, activity?.changeObservedAt);
        },
        render: canonical => withPublicEventCatalog(readCatalog, () => app.fetch(canonical, env, ctx)),
      });
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
    } else if (url.pathname === "/report/live/detail" && (request.method === "GET" || request.method === "HEAD")
      && !isFlightRequest(request) && !(url.searchParams.getAll("demo").length === 1 && url.searchParams.get("demo") === "ad")) {
      // Resolve the report before streaming the document, while HTTP status is still mutable.
      const ids = url.searchParams.getAll("reportId");
      let info;
      try {
        info = ids.length === 1 && ids[0] ? await getReportOgInfo(ids[0]) : null;
      } catch {
        return new Response("現地レポを読み込めませんでした。", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
      }
      response = info ? await withPublicReport(info, () => app.fetch(request, env, ctx))
        : await app.fetch(new Request(new URL("/404", url), request), env, ctx);
    } else if (STATIC_PUBLIC_PAGES && (url.pathname === "/report" || url.pathname === "/report/ticket" || url.pathname === "/api/public/report-events"
      || url.pathname.startsWith("/api/public/artist-report-summary/"))) {
      response = await withPublicEventCatalog(readCatalog, () => app.fetch(request, env, ctx));
    } else if (STATIC_PUBLIC_PAGES && url.pathname.startsWith("/events/")) {
      response = await withPublicEventCatalog(readCatalog, () => app.fetch(request, env, ctx), async id => {
        const xml = await fallbackSitemap(env.TIXREPO_PUBLIC_CATALOG, env.ASSETS, version);
        return xml === null ? null : sitemapHasEvent(xml, id);
      });
    } else {
      response = await app.fetch(request, env, ctx);
    }
    if (response.status === 404 && response.headers.get("Content-Type")?.includes("text/html") && response.body) {
      // vinext emits an extra robots tag for HTTP-access fallback pages alongside route metadata.
      response = new HTMLRewriter()
        .on("head", { element(el) { el.prepend('<title>ページが見つかりません｜ちけレポ</title><meta name="robots" content="noindex, follow" data-site-not-found-robots>', { html: true }); } })
        .on("head > title, body > title, div[hidden] > title, meta[name=robots], link[rel~=canonical]", { element(el) { el.remove(); } })
        .transform(response);
    }
    if (!previewHost) return response;
    const preview = new Response(response.body, response);
    preview.headers.set("X-Robots-Tag", "noindex");
    return preview;
  },
  async scheduled(controller, env, ctx) {
    const eventKickoff = controller.cron === OFFICIAL_EVENT_KICKOFF_SCHEDULE;
    if (controller.cron === OFFICIAL_EVENT_SCHEDULE || eventKickoff) {
      if (eventKickoff) {
        const until = Date.parse(env.TIXREPO_EVENT_KICKOFF_UNTIL ?? "");
        if (!Number.isFinite(until) || controller.scheduledTime > until || Date.now() > until) return;
      }
      await runOfficialEventCollection(env, controller.scheduledTime, eventKickoff);
      return;
    }
    if (controller.cron === PUBLIC_CATALOG_SCHEDULE && env.TIXREPO_PUBLIC_CATALOG) {
      try {
        const { refresh, sitemap } = await updatePublicCatalog(env.TIXREPO_PUBLIC_CATALOG, controller.scheduledTime, env.CF_VERSION_METADATA.id);
        console.log({ kind: "public_catalog_refresh", ...refresh, sitemap });
      } catch {
        console.warn({ kind: "public_catalog_refresh", status: "failed" });
        throw new Error("Public catalog refresh failed");
      }
      return;
    }
    const openingDay = controller.cron === SEAT_RESALE_OPENING_SCHEDULE
      ? new Date(controller.scheduledTime).toISOString().slice(0, 10)
      : null;
    if (openingDay && openingDay !== "2026-11-12" && openingDay !== "2026-11-13") return;
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
      failed?: string[];
      processed?: number;
      results?: Array<{ status?: string; newSeats?: number; newArenaSeats?: number }>;
    };
    const failed = result.failed?.length ?? result.results?.filter(row => row.status === "error").length ?? 0;
    console.log(JSON.stringify({ job: path, failed }));
    if (openingDay && env.TIXREPO_PUBLIC_CATALOG) {
      const rows = result.results ?? [];
      const receipt = {
        scheduledAt: new Date(controller.scheduledTime).toISOString(),
        finishedAt: new Date().toISOString(),
        processed: result.processed ?? 0,
        fetched: rows.filter(row => row.status === "ok").length,
        skipped: rows.filter(row => row.status === "skipped").length,
        failed,
        newSeats: rows.reduce((count, row) => count + (row.newSeats ?? 0), 0),
        newArenaSeats: rows.reduce((count, row) => count + (row.newArenaSeats ?? 0), 0),
      };
      await env.TIXREPO_PUBLIC_CATALOG.put(`operations/seat-resale-opening/${openingDay}.json`, JSON.stringify(receipt), {
        onlyIf: new Headers({ "If-None-Match": "*" }),
        httpMetadata: { contentType: "application/json" },
      });
    }
    if (failed > 0) throw new Error(`${path} reported ${failed} failed sources`);
  },
} satisfies ExportedHandler<TixrepoEnv>;
