import type { CrawledEvent } from "@/lib/types";
import { hasSetlistSongs } from "@/lib/setlistHelpers";

export function artistSetlistPath(slug: string) {
  return "/artists/" + encodeURIComponent(slug) + "/setlist";
}

export function performanceSetlistPath(slug: string, eventId: string) {
  return artistSetlistPath(slug) + "/" + encodeURIComponent(eventId);
}

export function canIndexPerformanceSetlist(event: Pick<CrawledEvent, "id" | "date" | "venue">, items: unknown, reviewed: boolean, today: string) {
  return /^[a-zA-Z0-9_-]+$/.test(event.id)
    && Boolean(event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && event.date <= today)
    && Boolean(event.venue.trim()) && hasSetlistSongs(items) && reviewed;
}

export function setlistPerformanceDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return year + "年" + month + "月" + day + "日";
}

export function performanceSetlistHeading(artist: string, venue: string, date: string, eventTitle: string) {
  const slot = eventTitle.match(/[（(]([^）)]*(?:部・開演|昼公演|夜公演|開演\d)[^）)]*)[）)]$/)?.[1];
  return artist + " " + venue + " " + setlistPerformanceDate(date) + (slot ? " " + slot : "") + "のセトリ";
}
