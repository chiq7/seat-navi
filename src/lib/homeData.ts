import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveArtist, type Artist } from "@/lib/artists";
import { isArtistOnlyEventTitle, parseEventTitle } from "@/lib/eventTitle";
import { fmtDate, seatAreaLabel } from "@/lib/artistPageHelpers";
import { getJstDateString } from "@/lib/artistPageData";
import { isAllowedOfficialResaleUrl } from "@/lib/external-seats/sourcePolicy";
import { formatXSeatPostLocation, isCurrentXSeatPost, isXSeatPostBlock, isXSeatPostUrl, X_SEAT_POST_EVIDENCE, X_SEAT_POST_MAX_AGE_MS, X_SEAT_POST_PREFIX } from "@/lib/external-seats/xSeatPosts";

import { hasSetlistSongs } from "@/lib/setlistHelpers";
import { filterPublishedFeedItems } from "@/lib/realtimeFeed";
import { excludeHiddenLiveReports } from "@/data/hiddenLiveReports";

export type UpcomingEvent = {
  id: string;
  artistSlug: string;
  artist: string;
  eventName: string;
  date: string;
  /** 自動案内の残日数計算に使うISO日付。表示にはdateを使う。 */
  dateIso?: string | null;
  period: string;
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
function isTestEvent(event: { title: string; artist_slug?: string | null }, artist?: Artist): boolean {
  if (artist?.slug === "test" || event.artist_slug === "test") return true;
  return parseEventTitle(event.title, artist?.name).isTestData;
}

/** 会場が確定していない公演は実在していても、TOPの発見・速報枠には出さない。 */
export function isVagueHomeVenue(venue: string): boolean {
  return /(某所|未定|未発表|調整中|後日発表|\bTBA\b|\bTBD\b)/i.test(venue.normalize("NFKC"));
}

function getEventName(event: HomeEventRow, artist: Artist): string {
  return parseEventTitle(event.title, artist.name).tourName || event.title;
}

/** 同じ公演の開催日一覧を「初日〜最終日」へ整形する。単日の場合は従来どおり1日だけ返す。 */
export function formatEventPeriod(dates: Array<string | null>): string {
  const sorted = [...new Set(dates.filter((date): date is string => Boolean(date)))].sort();
  if (sorted.length === 0) return "日程未定";
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first === last ? fmtDate(first) : `${fmtDate(first)}〜${fmtDate(last)}`;
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
  const bestByArtist = new Map<string, T>();
  for (const item of items) {
    const slug = getArtistSlug(item);
    const dateIso = getDateIso(item);
    const previous = bestByArtist.get(slug);
    if (previous === undefined || (dateIso && dateIso < (getDateIso(previous) ?? "9999"))) {
      bestByArtist.set(slug, item);
    }
  }
  return [...bestByArtist.values()];
}

// ─── 開催が近い公演 ──────────────────────────────────────────────────────────

/** 今日〜2ヶ月以内の公演を日付昇順で全アーティスト取得し、seat_reportsの実件数を付与する */
export async function getUpcomingHomeEvents(client: SupabaseClient, requireComplete = false): Promise<UpcomingEvent[]> {
  const today = getJstDateString();
  const until = new Date(today + "T00:00:00Z");
  until.setUTCMonth(until.getUTCMonth() + 2);

  const { data, error } = await client
    .from("events")
    .select(EVENT_COLUMNS)
    .gte("date", today)
    .lte("date", until.toISOString().slice(0, 10))
    .order("date", { ascending: true })
    .limit(200);

  if (requireComplete && error) throw new Error("Upcoming event read failed");
  const rows = (data as HomeEventRow[]) ?? [];

  const validRows: { ev: HomeEventRow; artist: Artist; eventName: string }[] = [];
  const tourDates = new Map<string, Array<string | null>>();
  for (const ev of rows) {
    const artist = resolveArtist(ev);
    if (!artist || isTestEvent(ev, artist) || isArtistOnlyEventTitle(ev.title, artist.name) || isVagueHomeVenue(ev.venue)) continue;
    const eventName = getEventName(ev, artist);
    validRows.push({ ev, artist, eventName });
    const tourKey = `${artist.slug}:${eventName}`;
    const dates = tourDates.get(tourKey) ?? [];
    dates.push(ev.date);
    tourDates.set(tourKey, dates);
  }
  if (validRows.length === 0) return [];

  // 同一アーティストが複数公演を持つ場合、最も近い（=未来公演なので最短日の）1件だけ残す
  const deduped = dedupeNearestByArtist(validRows, (r) => r.artist.slug, (r) => r.ev.date);
  deduped.sort((a, b) => (a.ev.date ?? "").localeCompare(b.ev.date ?? ""));

  const eventIds = deduped.map(({ ev }) => ev.id);
  const { data: reportRows, error: reportError } = await client
    .from("seat_reports")
    .select("event_id")
    .in("event_id", eventIds);
  if (requireComplete && reportError) throw new Error("Upcoming event report counts read failed");

  const counts = new Map<string, number>();
  for (const r of (reportRows as { event_id: string }[]) ?? []) {
    counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
  }

  return deduped.map(({ ev, artist, eventName }) => {
    return {
      id: ev.id,
      artistSlug: artist.slug,
      artist: artist.name,
      eventName,
      date: fmtDate(ev.date),
      dateIso: ev.date,
      period: formatEventPeriod(tourDates.get(`${artist.slug}:${eventName}`) ?? []),
      venue: ev.venue,
      count: (counts.get(ev.id) ?? 0).toLocaleString("ja-JP"),
    };
  });
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
export async function getFeaturedHomeEvents(client: SupabaseClient, topN = 5): Promise<UpcomingEvent[]> {
  const upcoming = await getUpcomingHomeEvents(client);
  return selectProvisionalFeaturedEvents(upcoming, topN);
}

// ─── リアルタイム速報 ────────────────────────────────────────────────────────

export type HomeFeedType = "当落レポ" | "公演情報" | "座席報告" | "座席予想" | "現地レポ" | "セトリ";

export type HomeFeedSource = "real" | "editorial" | "sample" | "collection";

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
  sourceUrl?: string;
  /** 投稿者がプロフィールで公開を許可した場合だけ表示するXユーザー名。 */
  xHandle: string | null;
  /** 実投稿と、集計対象外の編集部投稿・投稿イメージを表示側で区別する。 */
  source: HomeFeedSource;
};

/** 速報の種類ごとに、内容を直接確認できる最短の遷移先を返す。 */
export function feedItemHref(
  type: HomeFeedType,
  eventId: string,
  artistSlug: string,
  itemId: string,
): string {
  if (type === "現地レポ") return `/report/live/detail?reportId=${encodeURIComponent(itemId)}`;
  if (type === "セトリ") return `/artists/${encodeURIComponent(artistSlug)}/setlist?event=${encodeURIComponent(eventId)}`;
  if (type === "当落レポ") return `/artists/${encodeURIComponent(artistSlug)}#ticket-data`;
  if (type === "座席予想") return `/events/${encodeURIComponent(eventId)}#fan-prediction-title`;
  // Land on the seat map that shows this report, not the top of the show page.
  if (type === "座席報告") return `/events/${encodeURIComponent(eventId)}?seat_report=${encodeURIComponent(itemId)}#seat-map`;
  return `/events/${encodeURIComponent(eventId)}`;
}

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
  user_id: string | null;
  created_at: string;
  type: HomeFeedType;
  detail: string;
};

type SeatReportFeedRow = { id: string; event_id: string; user_id: string | null; created_at: string; block: string; row_num: number; seat_num: number };
type PredictionFeedRow = { id: string; event_id: string; user_id: string | null; created_at: string };
type AfterReportFeedRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  created_at: string;
  seat_area_type: string | null;
  seat_description?: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_number: string | null;
  seat_view_photo_paths: string[] | null;
};
type SetlistFeedRow = { id: string; event_id: string; created_at: string; items: unknown };
type TicketResultFeedRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  result: "won" | "lost";
  lost_application_count: number;
  comment: string | null;
  seat_type: string | null;
  seat_block: string | null;
  created_at: string;
};

function normalizedFeedDetail(detail: string): string {
  return detail.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("ja-JP");
}

/** 同じ本文が連続表示されないよう、並び順を保ったまま最初の1件だけ残す。 */
export function dedupeFeedItemsByDetail(items: HomeFeedItem[]): HomeFeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const detail = normalizedFeedDetail(item.detail);
    const key = item.source === "collection" ? `${item.href}\n${detail}` : detail;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const GENERATIONS_ARIAKE_EVENT_ID = "9b26c9b3aef538ae8438";
const GENERATIONS_ARENA_SOURCE_KEY = "8117da818c4f81fb9c81c72f4cad4230220a23667f9b0c07df1f5f20d6b2926b";

type CollectedSeatUpdate = {
  id: string;
  block: string;
  row_min: number | null;
  seat_min: number | null;
  source_url: string | null;
  source_type: string;
  observed_at: string;
  created_at: string;
  events: HomeEventRow;
};

async function getCollectedSeatUpdates(client: SupabaseClient, now: Date, requireComplete: boolean): Promise<HomeFeedItem[]> {
  const recent = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const freshX = new Date(now.getTime() - X_SEAT_POST_MAX_AGE_MS).toISOString();
  const { data, error } = await client.from("external_seat_observations")
    .select("id, block, row_min, seat_min, source_url, source_type, observed_at, created_at, events!inner(id, title, venue, date, artist_slug)")
    .eq("review_status", "approved")
    .eq("ingestion_method", "crawler")
    .eq("seat_area", "arena")
    .or(`and(source_type.in.(pia_resale,official_resale),created_at.gte.${recent}),and(source_type.eq.other,evidence_summary.eq.${X_SEAT_POST_EVIDENCE},source_url.like.${X_SEAT_POST_PREFIX}*,observed_at.gte.${freshX})`)
    .not("block", "is", null)
    .gte("events.date", getJstDateString(now))
    .order("created_at", { ascending: false })
    .limit(FEED_SOURCE_LIMIT);
  if (error && requireComplete) throw new Error("Collected seat updates could not be read");
  const rows = (data ?? []) as unknown as CollectedSeatUpdate[];
  const seenSources = new Set<string>();
  const updates: HomeFeedItem[] = [];
  for (const row of rows) {
    const event = row.events;
    const artist = resolveArtist(event);
    const fromX = row.source_type === "other" && isXSeatPostUrl(row.source_url);
    const sourceKey = fromX ? `x:${event.id}:${row.block}:${row.row_min}:${row.seat_min}` : `resale:${event.id}`;
    if ((!artist && !fromX) || !event.date || isTestEvent(event, artist) || isVagueHomeVenue(event.venue)
      || seenSources.has(sourceKey) || !row.source_url
      || !(fromX ? isCurrentXSeatPost(row.observed_at, now.getTime()) : isAllowedOfficialResaleUrl(row.source_url))
      || !(fromX ? isXSeatPostBlock(row.block) : /^[A-Z]\d{1,2}$/.test(row.block))) continue;
    seenSources.add(sourceKey);
    updates.push({
      id: `external-seat-${row.id}`,
      type: "公演情報",
      detail: fromX ? `Xの公開投稿で${formatXSeatPostLocation(row.block, row.row_min, row.seat_min)}を確認` : `公式リセールでアリーナ${row.block}ブロックを確認（外部参考）`,
      artistName: artist?.name ?? event.title,
      venue: event.venue,
      date: event.date,
      createdAt: fromX ? row.observed_at : row.created_at,
      href: `/events/${encodeURIComponent(event.id)}#seat-map`,
      sourceUrl: row.source_url,
      xHandle: null,
      source: "collection",
    });
  }
  return updates;
}

export async function getReviewedTicketUpdates(client: SupabaseClient, now: Date, requireComplete = false): Promise<HomeFeedItem[]> {
  const updates = await getCollectedSeatUpdates(client, now, requireComplete);
  const resaleOpens = new Date("2026-11-07T15:00:00+09:00");
  const resaleCloses = new Date("2026-11-10T00:00:00+09:00");
  if (now >= resaleOpens && now < resaleCloses) {
    updates.push({
      id: "yoasobi-sapporo-resale-202611", type: "公演情報",
      detail: "11/14・15公演の公式リセールは11/9 23:59まで。リセール分の電子チケットは11/12 18:00ごろ表示",
      artistName: "YOASOBI", venue: "大和ハウス プレミストドーム", date: "2026-11-14",
      createdAt: resaleOpens.toISOString(), href: "https://l-tike.com/concert/mevent/?mid=530064", xHandle: null, source: "editorial",
    });
  }
  if (now >= resaleOpens && now < new Date("2026-11-09T00:00:00+09:00")) {
    const { data, error } = await client.from("external_seat_observations")
      .select("observed_at").eq("event_id", GENERATIONS_ARIAKE_EVENT_ID)
      .eq("source_type", "ticketjam").eq("source_key", GENERATIONS_ARENA_SOURCE_KEY)
      .eq("review_status", "approved").maybeSingle();
    if (error && requireComplete) throw new Error("Reviewed ticket update read failed");
    if (data) updates.push({
      id: "generations-ariake-arena-reference-20261108", type: "公演情報",
      detail: "アリーナD1の座席範囲を追加しました（外部参考）",
      artistName: "GENERATIONS", venue: "有明アリーナ", date: "2026-11-08", createdAt: data.observed_at,
      href: `/events/${GENERATIONS_ARIAKE_EVENT_ID}#seat-map`, xHandle: null, source: "editorial",
    });
  }
  return updates;
}

/** Only published reports and reviewed collections belong in the live feed. */
export async function getRealtimeFeedItems(
  client: SupabaseClient,
  limit = 20,
  prefetchedUpcoming?: UpcomingEvent[] | Promise<UpcomingEvent[]>,
  requireComplete = false,
): Promise<HomeFeedItem[]> {
  // Keep the existing call signature; example generation no longer needs upcoming events.
  void prefetchedUpcoming;
  const now = new Date();
  const [ticketResultsRes, seatReportsRes, predictionsRes, afterReportsRes, setlistsRes, reviewedUpdates] = await Promise.all([
    client
      .from("event_ticket_results")
      .select("id, event_id, user_id, result, lost_application_count, comment, seat_type, seat_block, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    client
      .from("seat_reports")
      .select("id, event_id, user_id, created_at, block, row_num, seat_num")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    client
      .from("fan_seat_predictions")
      .select("id, event_id, user_id, created_at")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    excludeHiddenLiveReports(client
      .from("after_reports")
      .select("id, event_id, user_id, created_at, seat_area_type, seat_description, seat_block, seat_row, seat_number, seat_view_photo_paths"))
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    client
      .from("setlists")
      .select("id, event_id, created_at, items")
      .is("review_source", null)
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    getReviewedTicketUpdates(client, now, requireComplete),
  ]);
  if (requireComplete && [ticketResultsRes, seatReportsRes, predictionsRes, afterReportsRes, setlistsRes].some(result => result.error)) {
    throw new Error("Realtime feed source read failed");
  }

  const publicTicketResults = ((ticketResultsRes.data as TicketResultFeedRow[]) ?? [])
    .filter((r) => !r.comment?.trim().startsWith("[TEST]"));

  const ticketResultCandidates: FeedCandidate[] = publicTicketResults
    // 当選時に同時作成されるアリーナ座席報告との二重表示を避ける。
    .filter((r) => !(r.result === "won" && r.seat_type === "arena" && r.seat_block))
    .map((r) => {
      const resultLabel = r.result === "won"
        ? "当選"
        : r.lost_application_count > 1
          ? `落選（${r.lost_application_count}件）`
          : "落選";
      const comment = r.comment?.trim();
      return {
        id: r.id,
        event_id: r.event_id,
        user_id: r.user_id,
        created_at: r.created_at,
        type: "当落レポ",
        detail: comment ? `${resultLabel}・${comment}` : `${resultLabel}の結果が投稿されました`,
      };
    });

  const seatReportCandidates: FeedCandidate[] = ((seatReportsRes.data as SeatReportFeedRow[]) ?? []).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    user_id: r.user_id,
    created_at: r.created_at,
    type: "座席報告",
    // seat_reportsはアリーナ当選時のみ登録されるため、エリアは常に「アリーナ」固定
    detail: joinParts(["アリーナ", r.block, withSuffix(r.row_num, "列"), withSuffix(r.seat_num, "番")]),
  }));

  const predictionCandidates: FeedCandidate[] = ((predictionsRes.data as PredictionFeedRow[]) ?? []).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    user_id: r.user_id,
    created_at: r.created_at,
    type: "座席予想",
    detail: "予想図が投稿されました",
  }));

  const afterReportCandidates: FeedCandidate[] = ((afterReportsRes.data as AfterReportFeedRow[]) ?? []).map((r) => {
    const seatDesc = joinParts([
      r.seat_description?.trim() || (r.seat_area_type ? seatAreaLabel(r.seat_area_type) : null),
      r.seat_block || null,
      withSuffix(r.seat_row, "列"),
      withSuffix(r.seat_number, "番"),
    ]);
    const hasPhoto = (r.seat_view_photo_paths?.length ?? 0) > 0;
    const detail = hasPhoto
      ? (seatDesc ? `${seatDesc}・写真あり` : "写真あり")
      : (seatDesc || "現地レポが投稿されました");
    return { id: r.id, event_id: r.event_id, user_id: r.user_id, created_at: r.created_at, type: "現地レポ", detail };
  });

  const setlistCandidates: FeedCandidate[] = ((setlistsRes.data as SetlistFeedRow[]) ?? []).filter(r => hasSetlistSongs(r.items)).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    user_id: null,
    created_at: r.created_at,
    type: "セトリ",
    detail: "セットリストが更新されました",
  }));

  const raw: FeedCandidate[] = [
    ...ticketResultCandidates,
    ...seatReportCandidates,
    ...predictionCandidates,
    ...afterReportCandidates,
    ...setlistCandidates,
  ];

  const eventIds = [...new Set(raw.map((r) => r.event_id))];
  const userIds = [...new Set(raw.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];
  const [eventsResult, profilesResult] = await Promise.all([
    eventIds.length > 0
      ? client.from("events").select(EVENT_COLUMNS).in("id", eventIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? client
          .from("profiles")
          .select("id, x_handle, show_x_on_posts")
          .in("id", userIds)
          .eq("show_x_on_posts", true)
      : Promise.resolve({ data: [] }),
  ]);
  if (requireComplete && ("error" in eventsResult && eventsResult.error || "error" in profilesResult && profilesResult.error)) {
    throw new Error("Realtime feed event or profile read failed");
  }
  const { data: eventsData } = eventsResult;
  const { data: profilesData } = profilesResult;
  const eventMap = new Map(((eventsData as HomeEventRow[]) ?? []).map((e) => [e.id, e]));
  const xHandleMap = new Map(
    ((profilesData ?? []) as Array<{ id: string; x_handle: string | null; show_x_on_posts: boolean }>)
      .filter((profile) => profile.show_x_on_posts && profile.x_handle)
      .map((profile) => [profile.id, profile.x_handle as string]),
  );

  const items: HomeFeedItem[] = [...reviewedUpdates];
  const today = getJstDateString();
  const excludedKnownTestItems = new Set([
    "座席予想:e939d7972373467b8f51",
    "現地レポ:641fd724715944a89352",
  ]);
  for (const r of raw) {
    const ev = eventMap.get(r.event_id);
    if (!ev) continue;
    const artist = resolveArtist(ev);
    if (!artist || !ev.date || isTestEvent(ev, artist) || isVagueHomeVenue(ev.venue)) continue;
    if (excludedKnownTestItems.has(`${r.type}:${r.id}`)) continue;
    // 現地レポと実施後のセトリ更新は、公演日を迎えるまで速報に出さない。
    if ((r.type === "現地レポ" || r.type === "セトリ") && ev.date && ev.date > today) continue;

    const href = feedItemHref(r.type, ev.id, artist.slug, r.id);

    items.push({
      id: `${r.type}-${r.id}`,
      type: r.type,
      detail: r.detail,
      artistName: artist.name,
      venue: ev.venue,
      date: ev.date,
      createdAt: r.created_at,
      href,
      xHandle: r.user_id ? xHandleMap.get(r.user_id) ?? null : null,
      source: "real",
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return dedupeFeedItemsByDetail(filterPublishedFeedItems(items, now.getTime())).slice(0, Math.max(0, limit));
}

/** フィード表示用の短い日付（例: 7/12）。曜日は付けない */
export function fmtFeedDate(d: string | null): string {
  if (!d) return "日程未定";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}
