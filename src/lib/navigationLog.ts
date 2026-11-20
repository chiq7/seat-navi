import { PRODUCTION_ORIGIN, readLandingSignals, TRAFFIC_LOG_EXCLUSION_COOKIE } from "./analyticsTraffic";

const PUBLIC_PATH = /^\/(?:|search\/?|(?:venues|artists|events)(?:\/[a-z0-9_-]{1,80})?(?:\/(?:seat-guide|setlist|after-reports|news|day-guide))?\/?)$/i;
const X_HOSTS = new Set(["t.co", "x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]);
const SOCIAL_TAGS = new Set(["x", "line", "wechat", "threads", "instagram", "facebook"]);

export function isPublicNavigationPath(path: string) {
  return PUBLIC_PATH.test(path);
}

function matchesDomain(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function externalSource(host: string) {
  if (X_HOSTS.has(host)) return "x";
  if (matchesDomain(host, "line.me")) return "line";
  if (["wechat.com", "weixin.qq.com", "servicewechat.com"].some(domain => matchesDomain(host, domain))) return "wechat";
  if (["google.com", "google.co.jp", "search.yahoo.co.jp", "bing.com", "duckduckgo.com"].some(domain => matchesDomain(host, domain))) return "search";
  return "external";
}

function parseReferrer(value: string): URL | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password && !url.port
      && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export function publicNavigationLog(request: Request, url: URL, response: Response) {
  if (url.origin !== PRODUCTION_ORIGIN || request.method !== "GET" || !isPublicNavigationPath(url.pathname)
    || response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")
    || !request.headers.get("accept")?.includes("text/html") || request.headers.has("rsc")
    || request.headers.has("x-vinext-rsc") || request.headers.get("sec-purpose")?.includes("prefetch")
    || request.headers.get("purpose") === "prefetch" || request.headers.get("sec-gpc") === "1"
    || request.headers.get("cookie")?.split(/;\s*/).includes(`${TRAFFIC_LOG_EXCLUSION_COOKIE}=1`)) return null;

  const fetchMode = request.headers.get("sec-fetch-mode");
  const userAgent = request.headers.get("user-agent") ?? "";
  if ((fetchMode && fetchMode !== "navigate") || /bot\b|crawler|spider|headless/i.test(userAgent)) return null;

  const referrer = parseReferrer(request.headers.get("referer") ?? "");
  const internal = referrer?.origin === url.origin;
  const referrerHost = referrer?.hostname;
  const xReferrer = Boolean(referrerHost && X_HOSTS.has(referrerHost));
  const { campaign, appEvent } = readLandingSignals(url.search, userAgent, referrer?.href ?? "", url.origin);
  const tag = campaign.campaign_source?.toLowerCase();
  const taggedSource = !internal && tag && SOCIAL_TAGS.has(tag) ? tag : null;
  const referrerPost = xReferrer ? referrer?.pathname.match(/^\/(?:i\/web\/|i\/|[\w]{1,15}\/)status\/(\d{5,22})(?:\/|$)/)?.[1] : undefined;
  const taggedPost = taggedSource === "x" ? campaign.campaign_content?.match(/^(?:xpost[-_])?(\d{5,22})$/i)?.[1] : undefined;
  const shortPath = referrer?.hostname === "t.co" && /^\/[a-z0-9]{1,40}\/?$/i.test(referrer.pathname) ? referrer.pathname : null;

  return {
    kind: "public_navigation",
    landingPath: url.pathname,
    referrerHost: referrerHost ?? null,
    previousPath: internal && referrer && isPublicNavigationPath(referrer.pathname) ? referrer.pathname : null,
    source: internal ? "internal" : referrerHost ? externalSource(referrerHost) : "unknown",
    taggedSource,
    inApp: appEvent === "landing_in_line" ? "line" : appEvent === "landing_in_wechat" ? "wechat" : null,
    xShortUrl: shortPath ? `https://t.co${shortPath}` : null,
    xPostId: referrerPost ?? taggedPost ?? null,
    xPostSignal: referrerPost ? "referrer" : taggedPost ? "tag" : null,
  };
}
