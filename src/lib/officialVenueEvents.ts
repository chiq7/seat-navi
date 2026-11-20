import type { OfficialEventRecord } from "./workersAiEvents";

type VenueId = "kyocera-dome" | "k-arena" | "tokyo-garden-theater" | "ariake-arena" | "osaka-jo-hall" | "tokyo-dome";

export type OfficialEventSource = {
  venue: { id: VenueId; name: string };
  month: string;
  url: string;
};

const KYOCERA = "https://www.kyoceradome-osaka.jp/schedule/";
const K_ARENA = "https://k-arena.com/schedule/";
const GARDEN = "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/schedule/";
const ARIAKE = "https://ariake-arena.tokyo/event/";
const OSAKA_JO = "https://www.osaka-johall.com/event/";
const TOKYO_DOME = "https://www.tokyo-dome.co.jp/dome/event";
export const OFFICIAL_EVENT_USER_AGENT = "TixRepoEventCrawler/1.0 (+https://tixrepo.com/about)";

async function boundedText(response: Response, maxBytes: number) {
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw new Error("The official response is too large");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("The official response is too large");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function getOfficialEventText(url: string, kind: "robots" | "schedule") {
  const contentType = kind === "robots" ? "text/plain" : "text/html";
  const response = await fetch(url, {
    headers: { "User-Agent": OFFICIAL_EVENT_USER_AGENT, Accept: contentType },
    // Workers accepts manual redirects. An unexpected destination is never used as an official source.
    redirect: "manual", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    if (kind === "robots" && (response.status === 404 || response.status === 410)) return "";
    if (kind === "schedule" && response.status === 404) return null;
    throw new Error(kind + " HTTP " + response.status);
  }
  if (!(response.headers.get("content-type") ?? "").includes(contentType)) {
    await response.body?.cancel();
    throw new Error("Unexpected content type for " + kind);
  }
  return boundedText(response, kind === "robots" ? 128_000 : 1_048_576);
}

export function eventDateInJapan(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function officialEventSources(now: Date): OfficialEventSource[] {
  const month = eventDateInJapan(now).slice(0, 7);
  const [year, number] = month.split("-").map(Number);
  const months = Array.from({ length: 3 }, (_, index) =>
    new Date(Date.UTC(year, number - 1 + index, 1)).toISOString().slice(0, 7));
  return [
    ...months.map((target): OfficialEventSource => ({
      venue: { id: "kyocera-dome", name: "京セラドーム大阪" },
      month: target,
      url: KYOCERA + "?yearId=" + target.slice(0, 4) + "&monthId=" + Number(target.slice(5)),
    })),
    { venue: { id: "k-arena", name: "Kアリーナ横浜" }, month, url: K_ARENA },
    ...months.map((target): OfficialEventSource => ({
      venue: { id: "tokyo-garden-theater", name: "東京ガーデンシアター" },
      month: target,
      url: GARDEN + "?date=" + target,
    })),
    ...months.map((target, index): OfficialEventSource => ({
      venue: { id: "ariake-arena", name: "有明アリーナ" },
      month: target,
      url: ARIAKE + ["", "next/", "two/"][index],
    })),
    { venue: { id: "osaka-jo-hall", name: "大阪城ホール" }, month, url: OSAKA_JO },
    { venue: { id: "tokyo-dome", name: "東京ドーム" }, month, url: TOKYO_DOME },
  ];
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
};

function plain(html: string | undefined) {
  return (html ?? "").replace(/<\/?[a-z][\w:-]*(?:\s[^<>]*?)?\s*\/?>/gi, " ")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, value: string) => {
      if (value[0] !== "#") return ENTITIES[value.toLowerCase()] ?? entity;
      const point = /^#x/i.test(value) ? parseInt(value.slice(2), 16) : Number(value.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    })
    .replace(/\s+/g, " ").trim();
}

// Each adapter matches a specific card or field of the official calendar.
function fields(html: string, tag: string, token: string): string[] {
  const pattern = "<" + tag + "\\b(?=[^>]*\\bclass\\s*=\\s*[\"'](?:[^\"']*\\s)?" + token
    + "(?=[\\s\"'])[^\"']*[\"'])[^>]*>([\\s\\S]*?)<\\/" + tag + "\\s*>";
  return [...html.matchAll(new RegExp(pattern, "gi"))].map(match => match[1]);
}

function field(html: string, tag: string, token: string) {
  return plain(fields(html, tag, token)[0]);
}

function officialLink(html: string, source: OfficialEventSource, path: RegExp) {
  for (const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const candidate = new URL(plain(match[1]), source.url);
    if (candidate.origin === new URL(source.url).origin && path.test(candidate.pathname)) return candidate.href;
  }
  return source.url;
}

function sourceDate(raw: string, reference: string): string | null {
  const text = raw.normalize("NFKC");
  const [year, month] = reference.split("-").map(Number);
  const full = text.match(/^(\d{4})[./年-]\s*(\d{1,2})[./月-]\s*(\d{1,2})(?!\d)/);
  const short = full ? null : text.match(/^(\d{1,2})[./月-]\s*(\d{1,2})(?!\d)/);
  if (!full && !short) return null;
  const m = Number(full?.[2] ?? short?.[1]);
  const d = Number(full?.[3] ?? short?.[2]);
  const y = full ? Number(full[1]) : year + (m - month < -6 ? 1 : m - month > 6 ? -1 : 0);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? date.toISOString().slice(0, 10)
    : null;
}

function record(
  source: OfficialEventSource,
  title: string,
  dateText: string,
  performer: string,
  category: string,
  sourceUrl = source.url,
): OfficialEventRecord[] {
  const date = sourceDate(dateText, source.month);
  if (!date || !title || title.length > 250 || performer.length > 220 || category.length > 100) return [];
  return [{ title, date, performer, category, sourceUrl }];
}

function parseKyocera(html: string, source: OfficialEventSource) {
  return [...html.matchAll(/<section\b[^>]*\bid=["']event(\d{4}-\d{2}-\d{2})["'][^>]*>([\s\S]*?)<\/section>/gi)]
    .flatMap(([, date, card]) => {
      if (!date.startsWith(source.month)) return [];
      const header = fields(card, "div", "top")[0] ?? "";
      const title = plain(header.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
      const performer = plain(header.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
      const category = plain(header.match(/<\/h2>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]);
      return record(source, title, date, performer, category, source.url + "#event" + date);
    });
}

function parseKArena(html: string, source: OfficialEventSource) {
  return fields(html, "li", "schedule-list-item").flatMap(card => record(
    source, field(card, "h2", "schedule-list-item__title"), field(card, "p", "schedule-list-item__date"),
    field(card, "p", "schedule-list-item__artist"), "",
    officialLink(card, source, /^\/schedule\/\d{8}[^/]*\/?$/),
  ));
}

function parseGarden(html: string, source: OfficialEventSource) {
  return fields(html, "li", "event_all").flatMap(card => {
    const title = field(card, "div", "title");
    const performer = field(card, "div", "player");
    const category = field(card, "div", "tag");
    const url = officialLink(card, source, /^\/tokyo_garden_theater\/schedule\/\d+\/?$/);
    const dates = [...card.matchAll(/<div class="m">\s*(\d{1,2})\s*<\/div>\s*<div class="d">\s*(\d{1,2})\s*<\/div>/gi)];
    return dates.flatMap(([, month, day]) => record(source, title, month + "/" + day, performer, category, url));
  });
}

function parseAriake(html: string, source: OfficialEventSource) {
  const active = fields(html, "li", "active")[0] ?? "";
  const year = field(active, "span", "year");
  const month = field(active, "span", "month_number").padStart(2, "0");
  if (year + "-" + month !== source.month) throw new Error("The Ariake calendar returned the wrong month");
  return [...html.matchAll(/<li\b[^>]*\bid=["']?(detail-\d+)["']?[^>]*>([\s\S]*?)<\/li>/gi)]
    .flatMap(([, id, card]) => {
      const title = field(card, "p", "sub_title");
      const performer = plain(fields(card, "div", "event_name")[0]);
      const dateField = fields(card, "div", "event_day")[0] ?? "";
      return [...dateField.matchAll(/<span[^>]*>\s*(\d{1,2}\.\d{1,2})(?!\d)/gi)]
        .flatMap(([, day]) => record(source, title, day, performer, "", source.url + "#" + id));
    });
}

function parseOsakaJo(html: string, source: OfficialEventSource) {
  // The slider pairs full calendar dates with the official listing's event label.
  return fields(html, "div", "slider-inner-right").flatMap(card => record(
    source, field(card, "dt", "event-ttl"), field(card, "span", "date"), "",
    field(card, "span", "bg"),
  ));
}

function parseTokyoDome(html: string, source: OfficialEventSource) {
  const month = html.match(/<option\b[^>]*\bvalue=["'](\d{4}-\d{2})["'][^>]*\bselected\b/i)?.[1];
  if (month !== source.month) throw new Error("The Tokyo Dome calendar returned the wrong month");
  return fields(html, "li", "m-link-event__item").flatMap(card => record(
    source, field(card, "span", "m-link-event__titleText"), field(card, "span", "m-link-event__dateText"),
    "", field(card, "span", "m-badge"),
  ));
}

const READERS = {
  "kyocera-dome": parseKyocera,
  "k-arena": parseKArena,
  "tokyo-garden-theater": parseGarden,
  "ariake-arena": parseAriake,
  "osaka-jo-hall": parseOsakaJo,
  "tokyo-dome": parseTokyoDome,
};

export function parseOfficialEventSource(html: string, source: OfficialEventSource): OfficialEventRecord[] {
  const body = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const rows = READERS[source.venue.id](body, source);
  const unique = new Map(rows.map(row => [JSON.stringify([row.date, row.title, row.performer]), row]));
  return [...unique.values()];
}

export function excludedOfficialEvent(record: OfficialEventRecord) {
  const category = record.category.normalize("NFKC");
  const title = record.title.normalize("NFKC");
  return /^(野球|スポーツ|集会|学校行事|展示会|貸切|休館|式典)$/.test(category)
    || /^(休館日|貸切|非公開|リハーサル|設営|出演者は備考欄をご確認ください|Private)$/i.test(title)
    || /^(?:[[【]\s*)?(?:公演中止|開催中止|公演延期|開催延期)/.test(title)
    || (record.performer !== "" && title === record.performer.normalize("NFKC"));
}
