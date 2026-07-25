import crypto from "node:crypto";
import { ARTISTS } from "@/lib/artists";
import { getVenueIdAliases, VENUES } from "@/lib/eventCrawlerConfig";
import { makeEventId } from "@/lib/eventCrawler";

export type OfficialNewsEventCandidate = {
  id: string;
  artist_slug: string;
  article_title: string;
  category: string | null;
  is_event_candidate: boolean | null;
  event_name: string | null;
  tour_name: string | null;
  event_dates: string[] | null;
  venue_names: string[] | null;
  confidence: string | null;
  needs_review: boolean;
};

export type ExistingEvent = {
  id: string;
  title: string;
  venue: string;
  venue_id: string;
  date: string | null;
  genre: string;
  artist_slug: string | null;
};

export type PlannedNewsEvent = {
  id: string;
  title: string;
  venue: string;
  venue_id: string;
  date: string;
  genre: "kpop" | "johnnys" | "female_idol" | "male_idol" | "other";
  artist_slug: string;
  source_news_id: string;
};

export type SyncDecision = {
  news_id: string;
  artist_slug: string;
  status: "planned" | "already_exists" | "deferred";
  reason: string;
  event_count: number;
};

export type NewsEventPlan = {
  newRows: PlannedNewsEvent[];
  existingRows: PlannedNewsEvent[];
  decisions: SyncDecision[];
};

// リスト登録済みアーティストの現地イベントは種類で狭く限定しない。
// 明確なスポーツ出演だけは、音楽・ファン向けイベント一覧の対象外として除外する。
const IRRELEVANT_EVENT_SIGNAL = /(?:野球|球団|試合|サッカー|競馬|プロレス|バスケットボール)/i;
const FESTIVAL_SIGNAL = /(?:\bfes(?:tival)?\b|フェス)/i;
const VAGUE_VENUE = /^(?:オンライン|配信|都内某所|東京都某所|某所|関東会場|関西会場|全国|海外|北海道|福岡|静岡|神戸|広島)$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AUTO_SYNC_DATES = 14;

const VENUE_ALIASES: Record<string, string> = {
  "バンテリンドームナゴヤ": "vantelin-dome",
  "大和ハウスプレミストドーム": "sapporo-dome",
  "福岡paypayドーム": "paypay-dome",
  "みずほpaypayドーム福岡": "paypay-dome",
  "国立代々木競技場第一体育館": "yoyogi",
  "代々木第一体育館": "yoyogi",
  "マリンメッセ福岡a館": "marine-messe",
  "さいたまスーパーアリーナ": "saitama-super-arena",
};

export function normalizeVenueName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[「」『』“”‘’"'・･]/g, "")
    .replace(/[\s　_-]+/g, "")
    .trim();
}

function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stableUnknownVenueId(venueName: string): string {
  const digest = crypto.createHash("sha256").update(normalizeVenueName(venueName), "utf8").digest("hex").slice(0, 16);
  return `official-news-${digest}`;
}

type VenueResolution = { id: string; name: string };

function buildVenueResolver(existing: ExistingEvent[]): (venueName: string) => VenueResolution {
  const configuredByName = new Map<string, VenueResolution>();
  for (const venue of VENUES) configuredByName.set(normalizeVenueName(venue.name), { id: venue.id, name: venue.name });

  const existingByName = new Map<string, VenueResolution | null>();
  for (const event of existing) {
    const key = normalizeVenueName(event.venue);
    const current = existingByName.get(key);
    if (current === undefined) existingByName.set(key, { id: event.venue_id, name: event.venue });
    else if (current && current.id !== event.venue_id) existingByName.set(key, null);
  }

  return (venueName: string) => {
    const key = normalizeVenueName(venueName);
    const aliasId = VENUE_ALIASES[key];
    if (aliasId) {
      const configured = VENUES.find((venue) => venue.id === aliasId);
      return { id: aliasId, name: configured?.name ?? venueName.trim() };
    }
    const configured = configuredByName.get(key);
    if (configured) return configured;
    const known = existingByName.get(key);
    if (known) return known;
    return { id: stableUnknownVenueId(venueName), name: venueName.trim() };
  };
}

function pairDatesAndVenues(dates: string[], venues: VenueResolution[]): Array<{ date: string; venue: VenueResolution }> | null {
  if (dates.length === 0 || venues.length === 0) return null;
  if (venues.length === 1) return dates.map((date) => ({ date, venue: venues[0] }));
  if (dates.length < venues.length || dates.length % venues.length !== 0) return null;

  const datesPerVenue = dates.length / venues.length;
  return venues.flatMap((venue, venueIndex) =>
    dates
      .slice(venueIndex * datesPerVenue, (venueIndex + 1) * datesPerVenue)
      .map((date) => ({ date, venue })),
  );
}

function isSameVenue(existing: ExistingEvent, planned: PlannedNewsEvent): boolean {
  if (normalizeVenueName(existing.venue) === normalizeVenueName(planned.venue)) return true;
  const aliases = new Set(getVenueIdAliases(planned.venue_id));
  return aliases.has(existing.venue_id);
}

function hasExistingMatch(existing: ExistingEvent[], planned: PlannedNewsEvent): boolean {
  return existing.some((event) =>
    event.artist_slug === planned.artist_slug && event.date === planned.date && isSameVenue(event, planned),
  );
}

function defer(candidate: OfficialNewsEventCandidate, reason: string): SyncDecision {
  return { news_id: candidate.id, artist_slug: candidate.artist_slug, status: "deferred", reason, event_count: 0 };
}

export function planOfficialNewsEvents(
  candidates: OfficialNewsEventCandidate[],
  existing: ExistingEvent[],
): NewsEventPlan {
  const resolveVenue = buildVenueResolver(existing);
  const genreByArtist = new Map(ARTISTS.map((artist) => [artist.slug, artist.genre] as const));
  const newRows: PlannedNewsEvent[] = [];
  const existingRows: PlannedNewsEvent[] = [];
  const decisions: SyncDecision[] = [];
  const plannedKeys = new Set<string>();

  for (const candidate of candidates) {
    const title = (candidate.tour_name || candidate.event_name || candidate.article_title).trim();
    const searchable = `${title}\n${candidate.article_title}`;
    if (!candidate.is_event_candidate || !["live", "ticket"].includes(candidate.category ?? "")) {
      decisions.push(defer(candidate, "ライブ候補ではない"));
      continue;
    }
    if (candidate.needs_review || candidate.confidence !== "high") {
      decisions.push(defer(candidate, "AI判定が要確認、または確信度highではない"));
      continue;
    }
    if (IRRELEVANT_EVENT_SIGNAL.test(searchable)) {
      decisions.push(defer(candidate, "スポーツなど明確な対象外イベント"));
      continue;
    }

    const dates = unique(candidate.event_dates ?? []);
    if (dates.length === 0 || dates.some((date) => !isRealIsoDate(date))) {
      decisions.push(defer(candidate, "年付きの有効な公演日が確定していない"));
      continue;
    }
    if (dates.length > MAX_AUTO_SYNC_DATES) {
      decisions.push(defer(candidate, "長期開催を現在の1日1公演形式へ安全に変換できない"));
      continue;
    }

    const rawVenues = unique(candidate.venue_names ?? []);
    if (rawVenues.length === 0 || rawVenues.some((venue) => VAGUE_VENUE.test(venue.trim()))) {
      decisions.push(defer(candidate, "具体的な会場が確定していない"));
      continue;
    }
    if (rawVenues.length === 1 && dates.length > 3 && FESTIVAL_SIGNAL.test(searchable)) {
      decisions.push(defer(candidate, "フェス全日程とアーティスト出演日の区別が確定していない"));
      continue;
    }
    const pairs = pairDatesAndVenues(dates, rawVenues.map(resolveVenue));
    if (!pairs) {
      decisions.push(defer(candidate, "複数の日付と会場の対応関係を安全に確定できない"));
      continue;
    }

    const genre = genreByArtist.get(candidate.artist_slug) ?? "other";
    let plannedCount = 0;
    let existingCount = 0;
    for (const pair of pairs) {
      const row: PlannedNewsEvent = {
        id: makeEventId(pair.venue.id, pair.date, title),
        title,
        venue: pair.venue.name,
        venue_id: pair.venue.id,
        date: pair.date,
        genre,
        artist_slug: candidate.artist_slug,
        source_news_id: candidate.id,
      };
      const key = `${row.artist_slug}\u0000${row.date}\u0000${row.venue_id}`;
      if (hasExistingMatch(existing, row)) {
        existingRows.push(row);
        existingCount++;
      } else if (!plannedKeys.has(key)) {
        plannedKeys.add(key);
        newRows.push(row);
        plannedCount++;
      }
    }

    if (plannedCount > 0) {
      decisions.push({
        news_id: candidate.id,
        artist_slug: candidate.artist_slug,
        status: "planned",
        reason: existingCount > 0 ? `新規${plannedCount}件、既存${existingCount}件` : "自動反映条件を満たす",
        event_count: plannedCount,
      });
    } else {
      decisions.push({
        news_id: candidate.id,
        artist_slug: candidate.artist_slug,
        status: "already_exists",
        reason: "同一アーティスト・同日・同会場の公演が既に存在する",
        event_count: existingCount,
      });
    }
  }

  return { newRows, existingRows, decisions };
}

export function summarizeDecisions(decisions: SyncDecision[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const decision of decisions) {
    const key = `${decision.status}: ${decision.reason}`;
    summary[key] = (summary[key] ?? 0) + 1;
  }
  return summary;
}

export function toEventUpsertRows(rows: PlannedNewsEvent[]) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    venue: row.venue,
    venue_id: row.venue_id,
    date: row.date,
    genre: row.genre,
    artist_slug: row.artist_slug,
  }));
}
