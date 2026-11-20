const OFFICIAL_RESALE_HOSTS = new Set([
  "t.pia.jp",
  "cloak.pia.jp",
  "ticket.tickebo.jp",
]);

export const SEAT_RESALE_OPENING_SCHEDULE = "35 1 12,13 11 *";

export function isAllowedOfficialResaleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && OFFICIAL_RESALE_HOSTS.has(url.hostname.toLowerCase());
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

/** 開始が前日や当日のリセールも拾えるよう、公演5日前から当日まで巡回する。 */
export function isResaleCollectionWindow(eventDate: string | null | undefined, now = new Date()): boolean {
  const days = daysUntilEventInJst(eventDate, now);
  return days !== null && days >= 0 && days <= 5;
}

/** ぴあの詳細では注意事項や券種名から座席を拾わず、券面の位置だけを抽出する。 */
export function officialSeatText(html: string, sourceUrl: URL, targetDate: string): string {
  if (sourceUrl.hostname !== "cloak.pia.jp") return htmlToVisibleText(html);
  if (sourceUrl.pathname !== "/resale/item/detail") return "";

  const dateRow = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(([, body]) => htmlToVisibleText(body).normalize("NFKC"))
    .find(text => /^公演日\s+/.test(text));
  const date = dateRow?.match(/^公演日\s+(\d{4})\/(\d{1,2})\/(\d{1,2})(?!\d)/);
  const listedDate = date && [date[1], date[2].padStart(2, "0"), date[3].padStart(2, "0")].join("-");
  if (listedDate !== targetDate) throw new Error("リセールの公演日を照合できません");

  return [...html.matchAll(/<p\b[^>]*\bclass=["'][^"']*\bsl_ticketPriceDetail_name\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi)]
    .map(([, body]) => htmlToVisibleText(body)).join("\n");
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
  const target = new URL(targetUrl);
  const pathname = target.pathname + target.search;
  const matching = applicable
    .flatMap((group) => group.rules)
    .filter(({ path }) => {
      const anchored = path.endsWith("$");
      const expression = (anchored ? path.slice(0, -1) : path).split("*")
        .map(segment => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
      return new RegExp("^" + expression + (anchored ? "$" : "")).test(pathname);
    })
    .sort((a, b) => b.path.length - a.path.length || Number(b.allowed) - Number(a.allowed));
  return matching[0]?.allowed ?? true;
}
