import { getEventDisplayVenueName } from "./publicVenueGuides";
import { resolveArtist } from "./artists";
import { getPerformanceSessionMarker } from "./eventIdentity";
import { isArtistOnlyEventTitle, parseEventTitle } from "./eventTitle";
import { hasConfirmedPerformanceDate } from "./eventPublication";
import type { CrawledEvent } from "./types";

const tourKey = (event: CrawledEvent, artistName: string) => {
  if (!hasConfirmedPerformanceDate(event) || isArtistOnlyEventTitle(event.title, artistName)) return "";
  const { tourName, isTestData } = parseEventTitle(event.title.normalize("NFKC"), artistName.normalize("NFKC"));
  if (isTestData) return "";
  // A session suffix identifies the performance, not a second tour.
  const key = tourName.toLowerCase()
    .replace(/\s*[（(【\[]?\s*(?:昼公演|夜公演|昼の部|夜の部|(?:第\s*)?\d{1,2}部|(?:開演|start)\s*[:：]?\s*\d{1,2}:\d{2})\s*[）)】\]]?\s*$/iu, "")
    .replace(/[\s「」『』“”"‘’']/gu, "");
  if (isArtistOnlyEventTitle(key, artistName) || /^(?:live|tour|livetour|dometour|concert|公演|ライブ|コンサート|ツアー|ライブツアー)$/iu.test(key)) return "";
  return key;
};

export type TourDateLink = { id: string; direction: "previous" | "next"; label: string; detail: string };

export function eventTourDateLinks(event: CrawledEvent, related: readonly CrawledEvent[]): TourDateLink[] {
  const artist = resolveArtist(event);
  if (!artist || !event.date) return [];
  const date = event.date;
  const key = tourKey(event, artist.name);
  if (!key) return [];
  const candidates = related.filter(other => other.date && other.date !== date
    && resolveArtist(other)?.slug === artist.slug && tourKey(other, artist.name) === key);
  const days = [...new Set(candidates.map(other => other.date!))].sort();
  const links: TourDateLink[] = [];
  for (const direction of ["previous", "next"] as const) {
    const day = direction === "previous" ? days.filter(d => d < date).at(-1) : days.find(d => d > date);
    if (!day) continue;
    const adjacent = Math.abs(Date.parse(day + "T00:00:00Z") - Date.parse(date + "T00:00:00Z")) === 86400000;
    const when = direction === "previous" ? (adjacent ? "前日" : "前の日程") : (adjacent ? "翌日" : "次の日程");
    const [year, month, dayOfMonth] = day.split("-");
    const dateLabel = (date.slice(0, 4) !== year ? year + "/" : "") + Number(month) + "/" + Number(dayOfMonth);
    for (const other of candidates.filter(row => row.date === day).sort((a,b) => a.id.localeCompare(b.id))) {
      const session = getPerformanceSessionMarker(other.title);
      const sessionLabel = session ? other.title.match(/昼公演|夜公演|昼の部|夜の部|(?:第\s*)?\d{1,2}部|(?:開演|start)\s*[:：]?\s*\d{1,2}[:：]\d{2}/iu)?.[0] : "";
      links.push({ id: other.id, direction, label: `${when}（${dateLabel}）の座席・レポ`, detail: [getEventDisplayVenueName(other.venue_id, other.venue), sessionLabel].filter(Boolean).join("・") });
    }
  }
  return links;
}
