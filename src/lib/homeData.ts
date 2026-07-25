import { supabase } from "@/lib/supabase/client";
import { resolveArtist, type Artist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import { fmtDate, seatAreaLabel } from "@/lib/artistPageHelpers";

export type UpcomingEvent = {
  id: string;
  artistSlug: string;
  artist: string;
  eventName: string;
  date: string;
  venue: string;
  count: string;
};

const EVENT_COLUMNS = "id, title, venue, date, artist_slug";

type HomeEventRow = {
  id: string;
  title: string;
  venue: string;
  date: string | null;
  artist_slug: string | null;
};

/** テストデータ公演（artist_slug==="test"、またはタイトルの【テストデータ】タグ）を判定する */
function isTestEvent(event: { title: string; artist_slug?: string | null }, artist: Artist): boolean {
  if (artist.slug === "test" || event.artist_slug === "test") return true;
  return parseEventTitle(event.title, artist.name).isTestData;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 同一アーティストの候補が複数ある場合、現在日時から最も近い日付の1件だけを残す。
 * 日付未定(null)は最も遠い扱いとし、日付が確定している候補を優先する。
 */
function dedupeNearestByArtist<T>(
  items: T[],
  getArtistSlug: (item: T) => string,
  getDateIso: (item: T) => string | null,
): T[] {
  const now = Date.now();
  const bestByArtist = new Map<string, T>();
  const bestDist = new Map<string, number>();
  for (const item of items) {
    const slug = getArtistSlug(item);
    const dateIso = getDateIso(item);
    const dist = dateIso ? Math.abs(new Date(dateIso).getTime() - now) : Infinity;
    const current = bestDist.get(slug);
    if (current === undefined || dist < current) {
      bestByArtist.set(slug, item);
      bestDist.set(slug, dist);
    }
  }
  return [...bestByArtist.values()];
}

// ─── 開催が近い公演 ──────────────────────────────────────────────────────────

/** 今日〜2ヶ月以内の公演を日付昇順で全アーティスト取得し、seat_reportsの実件数を付与する */
export async function getUpcomingHomeEvents(): Promise<UpcomingEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(today);
  until.setMonth(until.getMonth() + 2);

  const { data } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .gte("date", toDateStr(today))
    .lte("date", toDateStr(until))
    .order("date", { ascending: true })
    .limit(200);

  const rows = (data as HomeEventRow[]) ?? [];

  const validRows: { ev: HomeEventRow; artist: Artist }[] = [];
  for (const ev of rows) {
    const artist = resolveArtist(ev);
    if (!artist || isTestEvent(ev, artist)) continue;
    validRows.push({ ev, artist });
  }
  if (validRows.length === 0) return [];

  // 同一アーティストが複数公演を持つ場合、最も近い（=未来公演なので最短日の）1件だけ残す
  const deduped = dedupeNearestByArtist(validRows, (r) => r.artist.slug, (r) => r.ev.date);
  deduped.sort((a, b) => (a.ev.date ?? "").localeCompare(b.ev.date ?? ""));

  const eventIds = deduped.map(({ ev }) => ev.id);
  const { data: reportRows } = await supabase
    .from("seat_reports")
    .select("event_id")
    .in("event_id", eventIds);

  const counts = new Map<string, number>();
  for (const r of (reportRows as { event_id: string }[]) ?? []) {
    counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
  }

  return deduped.map(({ ev, artist }) => ({
    id: ev.id,
    artistSlug: artist.slug,
    artist: artist.name,
    eventName: parseEventTitle(ev.title, artist.name).tourName || ev.title,
    date: fmtDate(ev.date),
    venue: ev.venue,
    count: (counts.get(ev.id) ?? 0).toLocaleString("ja-JP"),
  }));
}

// ─── 注目の公演 ──────────────────────────────────────────────────────────────

/**
 * アクセス数がまだ蓄積されていない期間だけ使う暫定の人気アーティスト候補。
 * 公演日は getUpcomingHomeEvents 側の昇順を優先し、この配列は対象判定にだけ使う。
 * ページアクセス集計を導入したら getFeaturedHomeEvents の選定ロジックを差し替える。
 */
export const PROVISIONAL_POPULAR_ARTIST_SLUGS = new Set([
  "snow-man",
  "mrs-green-apple",
  "nogizaka46",
  "sixtones",
  "number-i",
  "niziu",
  "seventeen",
  "stray-kids",
  "le-sserafim",
  "aespa",
  "twice",
  "ive",
  "enhypen",
  "bts",
  "king-prince",
  "naniwa-danshi",
  "timelesz",
  "be-first",
  "yoasobi",
  "officialdism",
  "one-ok-rock",
  "back-number",
  "fujii-kaze",
  "ado",
  "aimyon",
  "fruits-zipper",
  "me-i",
  "jo1",
  "ini",
  "tomorrow-x-together",
]);

/** 日付昇順の公演から、暫定人気候補に該当する上位件数だけを選ぶ。 */
export function selectProvisionalFeaturedEvents(
  events: UpcomingEvent[],
  topN = 5,
): UpcomingEvent[] {
  return events
    .filter((event) => PROVISIONAL_POPULAR_ARTIST_SLUGS.has(event.artistSlug))
    .slice(0, Math.max(0, topN));
}

/** 当面は、2ヶ月以内の人気アーティスト公演を開催日が近い順に返す。 */
export async function getFeaturedHomeEvents(topN = 5): Promise<UpcomingEvent[]> {
  const upcoming = await getUpcomingHomeEvents();
  return selectProvisionalFeaturedEvents(upcoming, topN);
}

// ─── リアルタイム速報 ────────────────────────────────────────────────────────

export type HomeFeedType = "座席報告" | "座席予想" | "現地レポ" | "セトリ";

export type HomeFeedItem = {
  id: string;
  type: HomeFeedType;
  /** 投稿内容の要約（例: 「アリーナ D3 4列2番」「予想図が投稿されました」） */
  detail: string;
  artistName: string;
  venue: string;
  date: string | null;
  createdAt: string;
  href: string;
};

/** 統合前にソースごとに取得する上限件数（統合後に全体の上位N件へ絞り込む前段のバッファ） */
const FEED_SOURCE_LIMIT = 40;

/** null/空文字を除いた要素だけをスペースで連結する（エリア・ブロック・列・番号など「持っているものだけ自然に連結」用） */
function joinParts(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => !!p).join(" ");
}

/** 末尾に単位が付いていなければ付与する（例: "4" → "4列"）。値が無ければnull */
function withSuffix(v: string | number | null | undefined, suffix: string): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v);
  return s.endsWith(suffix) ? s : `${s}${suffix}`;
}

type FeedCandidate = {
  id: string;
  event_id: string;
  created_at: string;
  type: HomeFeedType;
  detail: string;
};

type SeatReportFeedRow = { id: string; event_id: string; created_at: string; block: string; row_num: number; seat_num: number };
type PredictionFeedRow = { id: string; event_id: string; created_at: string };
type AfterReportFeedRow = {
  id: string;
  event_id: string;
  created_at: string;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_number: string | null;
  seat_view_photo_paths: string[] | null;
};
type SetlistFeedRow = { id: string; event_id: string; created_at: string };

/** 座席報告・座席予想・現地レポ・セトリの最新投稿をcreated_at降順で統合し、全体の上位limit件を返す */
export async function getRealtimeFeedItems(limit = 20): Promise<HomeFeedItem[]> {
  const [seatReportsRes, predictionsRes, afterReportsRes, setlistsRes] = await Promise.all([
    supabase
      .from("seat_reports")
      .select("id, event_id, created_at, block, row_num, seat_num")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    supabase
      .from("fan_seat_predictions")
      .select("id, event_id, created_at")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    supabase
      .from("after_reports")
      .select("id, event_id, created_at, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    supabase
      .from("setlists")
      .select("id, event_id, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
  ]);

  const seatReportCandidates: FeedCandidate[] = ((seatReportsRes.data as SeatReportFeedRow[]) ?? []).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    created_at: r.created_at,
    type: "座席報告",
    // seat_reportsはアリーナ当選時のみ登録されるため、エリアは常に「アリーナ」固定
    detail: joinParts(["アリーナ", r.block, withSuffix(r.row_num, "列"), withSuffix(r.seat_num, "番")]),
  }));

  const predictionCandidates: FeedCandidate[] = ((predictionsRes.data as PredictionFeedRow[]) ?? []).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    created_at: r.created_at,
    type: "座席予想",
    detail: "予想図が投稿されました",
  }));

  const afterReportCandidates: FeedCandidate[] = ((afterReportsRes.data as AfterReportFeedRow[]) ?? []).map((r) => {
    const seatDesc = joinParts([
      r.seat_area_type ? seatAreaLabel(r.seat_area_type) : null,
      r.seat_block || null,
      withSuffix(r.seat_row, "列"),
      withSuffix(r.seat_number, "番"),
    ]);
    const hasPhoto = (r.seat_view_photo_paths?.length ?? 0) > 0;
    const detail = hasPhoto
      ? (seatDesc ? `${seatDesc}・写真あり` : "写真あり")
      : (seatDesc || "現地レポが投稿されました");
    return { id: r.id, event_id: r.event_id, created_at: r.created_at, type: "現地レポ", detail };
  });

  const setlistCandidates: FeedCandidate[] = ((setlistsRes.data as SetlistFeedRow[]) ?? []).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    created_at: r.created_at,
    type: "セトリ",
    detail: "セットリストが更新されました",
  }));

  const raw: FeedCandidate[] = [
    ...seatReportCandidates,
    ...predictionCandidates,
    ...afterReportCandidates,
    ...setlistCandidates,
  ];

  if (raw.length === 0) return [];

  const eventIds = [...new Set(raw.map((r) => r.event_id))];
  const { data: eventsData } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .in("id", eventIds);
  const eventMap = new Map(((eventsData as HomeEventRow[]) ?? []).map((e) => [e.id, e]));

  const items: HomeFeedItem[] = [];
  for (const r of raw) {
    const ev = eventMap.get(r.event_id);
    if (!ev) continue;
    const artist = resolveArtist(ev);
    if (!artist || isTestEvent(ev, artist)) continue;

    const href =
      r.type === "現地レポ" ? `/report/live/detail?reportId=${r.id}`
      : r.type === "セトリ" ? `/artists/${artist.slug}/setlist`
      : `/events/${ev.id}`;

    items.push({
      id: `${r.type}-${r.id}`,
      type: r.type,
      detail: r.detail,
      artistName: artist.name,
      venue: ev.venue,
      date: ev.date,
      createdAt: r.created_at,
      href,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, limit);
}

/** 投稿日時を「3分前」のような相対表示にする */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}ヶ月前`;
  const years = Math.floor(days / 365);
  return `${years}年前`;
}

/** フィード表示用の短い日付（例: 7/12）。曜日は付けない */
export function fmtFeedDate(d: string | null): string {
  if (!d) return "日程未定";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}
