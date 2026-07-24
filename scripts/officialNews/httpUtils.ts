// Tier1/Tier2ストラテジー共通のHTTPユーティリティ(robots.txtチェック・タイムアウト付きfetch)。
// legacySites.ts(既存13組のspecial扱い)は意図的に変更していないため、同種のロジックを
// ここに独立して持つ(共通化してlegacySites.tsの挙動に影響を与えないため)。

export const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: { "User-Agent": DEFAULT_UA }, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export type RobotsCheck = { allowed: boolean; crawlDelay: number; reason: string };

/** チケレポの通常NEWS収集として、robots.txtのワイルドカード規則を確認する。 */
export async function checkRobotsAllowed(origin: string, path: string): Promise<RobotsCheck> {
  let robotsText: string;
  try {
    const res = await fetchWithTimeout(new URL("/robots.txt", origin).toString());
    if (!res.ok) {
      return { allowed: true, crawlDelay: 0, reason: `robots.txt HTTP ${res.status} (no explicit restriction found)` };
    }
    robotsText = await res.text();
  } catch (e) {
    return { allowed: true, crawlDelay: 0, reason: `robots.txt fetch failed (${(e as Error).message}); treated as no restriction` };
  }

  type Group = { agents: string[]; rules: { type: string; path: string }[]; crawlDelay: number };
  const groups: Group[] = [];
  let current: Group | null = null;
  let ruleSeenSinceUA = false;
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || ruleSeenSinceUA) {
        current = { agents: [], rules: [], crawlDelay: 0 };
        groups.push(current);
        ruleSeenSinceUA = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" || key === "allow") {
      if (current) {
        current.rules.push({ type: key, path: value });
        ruleSeenSinceUA = true;
      }
    } else if (key === "crawl-delay") {
      if (current) {
        const n = parseFloat(value);
        if (!Number.isNaN(n)) current.crawlDelay = Math.max(current.crawlDelay, n);
        ruleSeenSinceUA = true;
      }
    }
  }

  const agentsToCheck = ["*"];
  let crawlDelay = 0;
  for (const agent of agentsToCheck) {
    for (const g of groups) {
      if (!g.agents.includes(agent)) continue;
      crawlDelay = Math.max(crawlDelay, g.crawlDelay || 0);
      let matched: { type: string; path: string } | null = null;
      for (const r of g.rules) {
        if (r.path === "") continue;
        if (path.startsWith(r.path)) {
          if (!matched || r.path.length > matched.path.length) matched = r;
        }
      }
      if (matched && matched.type === "disallow") {
        return { allowed: false, crawlDelay, reason: `robots.txt disallows agent "${agent}" for path prefix "${matched.path}"` };
      }
    }
  }
  return { allowed: true, crawlDelay, reason: "no matching Disallow rule for the wildcard crawler agent" };
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  const decodeNumericEntity = (entity: string, value: string, radix: number): string => {
    const codePoint = Number.parseInt(value, radix);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  };
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex: string) => decodeNumericEntity(entity, hex, 16))
    .replace(/&#(\d+);/g, (entity, decimal: string) => decodeNumericEntity(entity, decimal, 10))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 記事URLの許可/除外/正規化ルールを適用する。 */
export function applyUrlRules(
  url: string,
  rules?: {
    allow?: string[];
    deny?: string[];
    normalize?: { stripQuery?: boolean; dropQueryParams?: string[]; stripTrailingSlash?: boolean; forceHttps?: boolean };
  },
): string | null {
  if (!rules) return url;
  if (rules.deny?.some((p) => new RegExp(p).test(url))) return null;
  if (rules.allow && rules.allow.length > 0 && !rules.allow.some((p) => new RegExp(p).test(url))) return null;

  let out = url;
  if (rules.normalize?.forceHttps) out = out.replace(/^http:\/\//, "https://");
  if (rules.normalize?.stripQuery) {
    out = out.split("?")[0];
  } else if (rules.normalize?.dropQueryParams?.length) {
    const parsed = new URL(out);
    for (const param of rules.normalize.dropQueryParams) parsed.searchParams.delete(param);
    out = parsed.toString();
  }
  if (rules.normalize?.stripTrailingSlash) out = out.replace(/\/$/, "");
  return out;
}
