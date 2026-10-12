import type { Artist } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

export const DEFAULT_ARTIST_HERO_IMAGE = "/images/hero/artist-top.png";

export function resolveArtistHeroImage(heroImage?: string | null): string {
  const value = heroImage?.trim();
  return value && value.startsWith("/") ? value : DEFAULT_ARTIST_HERO_IMAGE;
}

/** DateをAsia/Tokyoの暦日 YYYY-MM-DD に変換する。 */
export function getJstDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function matchPriority(event: CrawledEvent): number {
  return event.artist_match_source === "explicit" || event.artist_slug ? 0 : 1;
}

/** 日付→明示紐付け→会場→タイトル→idで、同じ入力から常に同じ順序を得る。 */
export function compareUpcomingEvents(a: CrawledEvent, b: CrawledEvent): number {
  return (
    (a.date ?? "9999-12-31").localeCompare(b.date ?? "9999-12-31") ||
    matchPriority(a) - matchPriority(b) ||
    a.venue.localeCompare(b.venue, "ja") ||
    a.title.localeCompare(b.title, "ja") ||
    a.id.localeCompare(b.id)
  );
}

export function getUpcomingEvents(events: readonly CrawledEvent[], today: string): CrawledEvent[] {
  return events
    .filter((event) => event.date != null && event.date >= today)
    .sort(compareUpcomingEvents);
}

export function getPastEvents(events: readonly CrawledEvent[], today: string): CrawledEvent[] {
  return events
    .filter((event) => event.date == null || event.date < today)
    .sort((a, b) => {
      const dateOrder = (b.date ?? "").localeCompare(a.date ?? "");
      return dateOrder || compareUpcomingEvents(a, b);
    });
}

export function selectNextEvent(events: readonly CrawledEvent[], today: string): CrawledEvent | null {
  return getUpcomingEvents(events, today)[0] ?? null;
}

function utcDayNumber(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function daysUntilJstDate(date: string | null | undefined, today: string): number | null {
  if (!date) return null;
  return utcDayNumber(date) - utcDayNumber(today);
}

/** 選択中→次回→最新過去の優先順位で予想図の対象公演を決める。 */
export function selectPredictionEventId(
  events: readonly CrawledEvent[],
  today: string,
  selectedEventId?: string | null,
): string | null {
  if (selectedEventId && events.some((event) => event.id === selectedEventId)) return selectedEventId;
  const next = selectNextEvent(events, today);
  if (next) return next.id;
  return getPastEvents(events, today)[0]?.id ?? null;
}

/** fixtureテストと画面で共有する、アーティスト登録後の公演派生データ。 */
export function buildArtistPageData(
  artist: Artist,
  events: readonly CrawledEvent[],
  now: Date = new Date(),
) {
  const today = getJstDateString(now);
  const upcoming = getUpcomingEvents(events, today);
  return {
    artistSlug: artist.slug,
    artistName: artist.name,
    heroImage: resolveArtistHeroImage(artist.heroImage),
    today,
    nextEvent: upcoming[0] ?? null,
    upcoming,
    past: getPastEvents(events, today),
  };
}
