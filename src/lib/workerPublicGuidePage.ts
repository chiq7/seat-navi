import { validPublicGuideSnapshot } from "./publicGuideSnapshot";
import { staticPageAsset } from "./staticPublicPages";
import { getJstDateString } from "./artistPageData";

export const GUIDE_HTML_TTL = 15 * 60;
const FALLBACK_TTL = 60;
const pending = new Set<string>();

type Services = {
  assets: { fetch(request: Request): Promise<Response> };
  cache: () => Promise<Pick<Cache, "match" | "put">>;
  render: (request: Request) => Promise<Response>;
  release: string;
  hasSession: boolean;
  venueLastChange?: (id: string) => Promise<string | undefined>;
};

export function isLocalPageCapture(request: Request, url: URL) {
  return url.protocol === "http:" && url.hostname === "127.0.0.1"
    && request.headers.get("X-Tixrepo-Prepare-Page") === "1";
}

export function isFlightRequest(request: Request) {
  return request.headers.get("rsc") === "1" || request.headers.has("x-vinext-rsc")
    || Boolean(request.headers.get("accept")?.includes("text/x-component"));
}

const routerHeaders = [
  "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch", "next-url",
  "x-vinext-interception-context", "x-vinext-interception-id", "x-vinext-mounted-slots",
  "x-vinext-mounted-layouts", "x-vinext-rsc-render-mode", "x-vinext-rsc-state-fingerprint",
];

function unavailable() {
  return new Response("ただいまページを表示できません。しばらくしてからもう一度お試しください。", {
    status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function validated(request: Promise<Response>, path: string, flight: boolean, source: string, builtAsset = false) {
  const response = await request;
  const mime = flight ? "text/x-component" : "text/html";
  if (response.status !== 200 || response.headers.has("Set-Cookie") || !response.headers.get("Content-Type")?.startsWith(mime)) {
    await response.body?.cancel();
    return null;
  }
  const headers = new Headers(response.headers);
  headers.set("X-Tixrepo-Page-Delivery", source);
  if (builtAsset && headers.get("X-Tixrepo-Prepared-Page") === "validated") {
    // This marker is emitted only by the generation step, after checking the artifacts in
    // this exact ASSETS deployment. Streaming avoids re-parsing a large venue on every cold hit.
    headers.delete("X-Tixrepo-Prepared-Page");
    headers.delete("Vary");
    return new Response(response.body, { headers });
  }
  const body = await response.text();
  if (!validPublicGuideSnapshot(path, body, flight)) return null;
  // A buffered fetch body may already have been decoded. Let the transport size it again.
  for (const name of ["Content-Encoding", "Content-Length", "Transfer-Encoding", "Age", "Date", "Expires", "Vary"])
    headers.delete(name);
  return new Response(body, { headers });
}

async function withDeadline<T>(read: (signal: AbortSignal) => Promise<T>, duration: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("Public page read timed out")); }, duration);
  });
  try { return await Promise.race([read(controller.signal), timeout]); }
  finally { clearTimeout(timer!); }
}

function forClient(response: Response, request: Request, state: string) {
  const headers = new Headers(response.headers);
  headers.set("X-Tixrepo-Page-Cache", state);
  // HTML and router payloads share the external URL. Only the release-scoped internal key is publicly cached.
  if (response.ok) headers.set("Cache-Control", "private, no-cache");
  headers.set("Vary", ["Accept", "RSC", "X-Vinext-RSC", ...routerHeaders].join(", "));
  if (request.method === "HEAD") {
    void response.body?.cancel();
    return new Response(null, { status: response.status, headers });
  }
  return new Response(response.body, { status: response.status, headers });
}

export async function servePublicGuidePage(request: Request, services: Services): Promise<Response> {
  const url = new URL(request.url);
  const hasState = routerHeaders.some(name => request.headers.has(name));
  const flight = isFlightRequest(request);
  if (request.method !== "GET" && request.method !== "HEAD" || services.hasSession
    || request.headers.has("authorization") || request.headers.has("next-action")
    || /(?:^|;\s*)(?:__prerender_bypass|__next_preview_data)=/.test(request.headers.get("cookie") ?? "") || hasState) {
    // Render signed-in pages and router-specific patches with their own request and routing headers.
    const rendered = await services.render(request);
    const response = new Response(rendered.body, rendered);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const isVenue = url.pathname.startsWith("/venues/");
  const isHome = url.pathname === "/";
  const today = getJstDateString();
  const kind = flight ? "rsc" : "html";
  const assetUrl = new URL(staticPageAsset(url.pathname, flight), url.origin);
  const asset = async () => {
    const result = await withDeadline(signal => validated(services.assets.fetch(new Request(assetUrl, { signal })),
      url.pathname, flight, "static-" + kind, true), 4_000).catch(() => null);
    if (isHome && result) {
      const savedAt = Date.parse(result.headers.get("X-Tixrepo-Prepared-At") ?? "");
      if (!Number.isFinite(savedAt) || getJstDateString(new Date(savedAt)) !== today) {
        await result.body?.cancel();
        return null;
      }
    }
    return result;
  };
  const render = () => withDeadline(signal => {
    // A full Flight request has vinext's empty _rsc fingerprint. Metadata for HTML is
    // resolved in head for everyone; incoming bot identity, cookies and query never enter this render.
    const canonical = url.origin + url.pathname + (flight ? "?_rsc" : "");
    const headers: HeadersInit = flight ? { Accept: "text/x-component", RSC: "1" }
      : { Accept: "text/html", "User-Agent": "Twitterbot/1.0" };
    return validated(services.render(new Request(canonical, { headers, signal })), url.pathname, flight, "ssr-" + kind);
  }, 7_000).catch(() => null);
  const keyUrl = new URL(assetUrl);
  keyUrl.searchParams.set("release", services.release);
  keyUrl.searchParams.set("jstDay", today);
  const key = new Request(keyUrl);
  const cache = await services.cache().catch(() => null);
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) return forClient(hit, request, "HIT");

  // Never share a request-bound stream or promise across Workers invocations.
  if (pending.has(key.url)) return forClient(await asset() ?? (isHome ? await render() : null) ?? unavailable(), request, "BUSY");
  pending.add(key.url);
  try {
    let ttl = GUIDE_HTML_TTL;
    // Venue fixtures are deployment assets; venue programs refresh separately. Artist events
    // can change between deployments, so both full HTML and Flight prefer a current render.
    let page: Response | null = null;
    if (isVenue) {
      const built = await asset();
      const preparedAt = built?.headers.get("X-Tixrepo-Prepared-At");
      // The build snapshot is fresh within its JST day unless this venue changed after capture.
      const latest = preparedAt && services.venueLastChange
        ? await services.venueLastChange(url.pathname.slice("/venues/".length)).catch(() => undefined) : undefined;
      const expired = preparedAt && Number.isFinite(Date.parse(preparedAt))
        && (getJstDateString(new Date(preparedAt)) !== getJstDateString() || (latest && Date.parse(latest) > Date.parse(preparedAt)));
      if (built && !expired) page = built;
      else {
        page = await render();
        if (page) await built?.body?.cancel();
        else { page = built; ttl = FALLBACK_TTL; }
      }
    } else {
      page = await render();
      if (!page) { page = await asset(); ttl = FALLBACK_TTL; }
    }
    if (!page) return forClient(unavailable(), request, "UNAVAILABLE");
    if (cache) {
      page.headers.set("Cache-Control", `public, max-age=${ttl}`);
      await cache.put(key, page.clone()).catch(() => console.warn({ kind: "public_guide_cache_write_failed", path: url.pathname }));
    }
    return forClient(page, request, ttl === FALLBACK_TTL ? "FALLBACK" : "MISS");
  } finally {
    pending.delete(key.url);
  }
}

