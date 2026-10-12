const OFFICIAL_RESALE_HOSTS = new Set([
  "t.pia.jp",
  "cloak.pia.jp",
  "ticket.tickebo.jp",
]);

export function isAllowedOfficialResaleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && OFFICIAL_RESALE_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function htmlToVisibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<\/li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function jstDateParts(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** 公演日までのJST日数。日付が不正ならnull。 */
export function daysUntilEventInJst(eventDate: string | null | undefined, now = new Date()): number | null {
  const match = eventDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const eventDay = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = jstDateParts(now);
  const todayDay = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((eventDay - todayDay) / 86_400_000);
}

/** リセール公開が多い、公演の5〜3日前だけを巡回対象にする。 */
export function isResaleCollectionWindow(eventDate: string | null | undefined, now = new Date()): boolean {
  const days = daysUntilEventInJst(eventDate, now);
  return days !== null && days >= 3 && days <= 5;
}

type RobotsRule = { path: string; allowed: boolean };

/** robots.txt の最長一致ルールで、対象パスを取得可能か判定する。 */
export function robotsAllowsPath(robotsText: string, targetUrl: string, userAgent: string): boolean {
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value) current.rules.push({ path: value, allowed: key === "allow" });
    }
  }

  const normalizedAgent = userAgent.toLowerCase();
  const exactGroups = groups.filter((group) => group.agents.some((agent) => agent !== "*" && normalizedAgent.includes(agent)));
  const applicable = exactGroups.length > 0 ? exactGroups : groups.filter((group) => group.agents.includes("*"));
  const pathname = new URL(targetUrl).pathname;
  const matching = applicable
    .flatMap((group) => group.rules)
    .filter((rule) => pathname.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allowed) - Number(a.allowed));
  return matching[0]?.allowed ?? true;
}
