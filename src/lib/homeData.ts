import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveArtist, type Artist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import { fmtDate, seatAreaLabel } from "@/lib/artistPageHelpers";

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
export async function getUpcomingHomeEvents(client: SupabaseClient): Promise<UpcomingEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(today);
  until.setMonth(until.getMonth() + 2);

  const { data } = await client
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
  const { data: reportRows } = await client
    .from("seat_reports")
    .select("event_id")
    .in("event_id", eventIds);

  const counts = new Map<string, number>();
  for (const r of (reportRows as { event_id: string }[]) ?? []) {
    counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
  }

  return deduped.map(({ ev, artist }) => {
    const eventName = getEventName(ev, artist);
    const periodDates = validRows
      .filter((candidate) => (
        candidate.artist.slug === artist.slug
        && getEventName(candidate.ev, candidate.artist) === eventName
      ))
      .map((candidate) => candidate.ev.date);

    return {
      id: ev.id,
      artistSlug: artist.slug,
      artist: artist.name,
      eventName,
      date: fmtDate(ev.date),
      dateIso: ev.date,
      period: formatEventPeriod(periodDates),
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

export type HomeFeedSource = "real" | "editorial" | "sample";

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
  /** 実投稿と、集計対象外の編集部投稿・投稿イメージを表示側で区別する。 */
  source: HomeFeedSource;
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
type TicketResultFeedRow = {
  id: string;
  event_id: string;
  result: "won" | "lost";
  lost_application_count: number;
  comment: string | null;
  seat_type: string | null;
  seat_block: string | null;
  created_at: string;
};

/** 実投稿数が増えるほど、集計対象外の補助カードを段階的に減らす。 */
export function supplementalFeedCount(realItemCount: number): number {
  if (realItemCount <= 0) return 5;
  if (realItemCount === 1) return 3;
  if (realItemCount === 2) return 2;
  if (realItemCount <= 4) return 1;
  return 0;
}

const SUPPLEMENTAL_COPY = [
  "第1希望で当選しました！公演日までまだ先だけど今から楽しみです",
  "今回は残念ながら全滅でした…。次の先行があればもう一度申し込みたい",
  "最後の1公演だけ当選！結果を見るまでずっと緊張していました",
  "友達とそれぞれ申し込んで、片方だけ当選しました",
  "第一希望は落選、第二希望で当選しました。参加できるだけでうれしい！",
  "当落メールを見るのが怖くて、しばらく開けませんでした",
  "複数公演に申し込んで1公演当選。どの日も激戦だったのかな",
  "初めて申し込んだ公演に当選しました！今から楽しみです",
  "今回は落選でした。みなさんの結果も気になります",
  "当選の文字を見た瞬間、思わず何度も確認しました",
  "同行者と一緒に結果確認。無事に当選してひと安心です",
  "次の申込みの参考にしたいので、みなさんの結果も教えてください",
] as const;

function buildCountdownDetail(remainingDays: number, index: number): string {
  if (remainingDays === 0) {
    const variants = [
      "本日開催！座席が分かったら、ブロックや列をレポできます",
      "いよいよ本番当日。会場で分かった座席情報を共有できます",
    ] as const;
    return variants[index % variants.length];
  }
  if (remainingDays === 1) {
    const variants = [
      "公演まであと1日。参加予定の方は準備できましたか？",
      "明日開催！座席が分かったら、会場からレポできます",
    ] as const;
    return variants[index % variants.length];
  }
  const variants = [
    `公演まであと${remainingDays}日。参加予定の方は準備できましたか？`,
    `開催まであと${remainingDays}日。座席が分かったらレポで共有できます`,
  ];
  return variants[index % variants.length];
}

function normalizedFeedDetail(detail: string): string {
  return detail.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("ja-JP");
}

/** 同じ本文が連続表示されないよう、並び順を保ったまま最初の1件だけ残す。 */
export function dedupeFeedItemsByDetail(items: HomeFeedItem[]): HomeFeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizedFeedDetail(item.detail);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function daysUntil(date: string | null, now: Date): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * DBへ保存しない編集部投稿・投稿イメージを作る。
 * sourceがrealではないため、当選率・投稿数・人気順の集計には入らない。
 */
export function buildSupplementalFeedItems(
  events: UpcomingEvent[],
  realItemCount: number,
  now = new Date(),
): HomeFeedItem[] {
  const count = supplementalFeedCount(realItemCount);
  if (count === 0 || events.length === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const event = events[index % events.length];
    const remainingDays = daysUntil(event.dateIso ?? null, now);
    // 公演直前でも案内だけに偏らないよう、最大2件を編集部のカウントダウンにする。
    const isCountdown = index < 2 && remainingDays !== null && remainingDays >= 0 && remainingDays <= 7;
    const detail = isCountdown
      ? buildCountdownDetail(remainingDays, index)
      : SUPPLEMENTAL_COPY[index % SUPPLEMENTAL_COPY.length];

    return {
      id: `supplemental-${event.id}-${index}`,
      type: isCountdown ? "公演情報" : "当落レポ",
      detail,
      artistName: event.artist,
      venue: event.venue,
      date: event.dateIso ?? null,
      createdAt: now.toISOString(),
      href: `/report/ticket?event=${encodeURIComponent(event.id)}`,
      source: isCountdown ? "editorial" : "sample",
    };
  });
}

/** 当落・座席報告・座席予想・現地レポ・セトリの最新投稿を統合し、不足分だけ補助カードを返す */
export async function getRealtimeFeedItems(
  client: SupabaseClient,
  limit = 20,
  prefetchedUpcoming?: UpcomingEvent[] | Promise<UpcomingEvent[]>,
): Promise<HomeFeedItem[]> {
  const [ticketResultsRes, seatReportsRes, predictionsRes, afterReportsRes, setlistsRes] = await Promise.all([
    client
      .from("event_ticket_results")
      .select("id, event_id, result, lost_application_count, comment, seat_type, seat_block, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    client
      .from("seat_reports")
      .select("id, event_id, created_at, block, row_num, seat_num")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    client
      .from("fan_seat_predictions")
      .select("id, event_id, created_at")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    client
      .from("after_reports")
      .select("id, event_id, created_at, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
    client
      .from("setlists")
      .select("id, event_id, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_SOURCE_LIMIT),
  ]);

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
        created_at: r.created_at,
        type: "当落レポ",
        detail: comment ? `${resultLabel}・${comment}` : `${resultLabel}の結果が投稿されました`,
      };
    });

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
    ...ticketResultCandidates,
    ...seatReportCandidates,
    ...predictionCandidates,
    ...afterReportCandidates,
    ...setlistCandidates,
  ];

  const eventIds = [...new Set(raw.map((r) => r.event_id))];
  const { data: eventsData } = eventIds.length > 0
    ? await client.from("events").select(EVENT_COLUMNS).in("id", eventIds)
    : { data: [] };
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
      : r.type === "当落レポ" ? `/artists/${artist.slug}`
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
      source: "real",
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const uniqueItems = dedupeFeedItemsByDetail(items);
  // 座席・セトリが多くても、実際に表示できる当落レポが育つまでは投稿イメージを残す。
  const realTicketResultCount = uniqueItems.filter((item) => item.type === "当落レポ").length;
  const supplementalCount = supplementalFeedCount(realTicketResultCount);
  const cappedSupplementalCount = Math.min(supplementalCount, Math.max(0, limit));
  const realItems = uniqueItems.slice(0, Math.max(0, limit - cappedSupplementalCount));
  if (supplementalCount === 0) return realItems;

  const upcoming = prefetchedUpcoming
    ? await prefetchedUpcoming
    : await getUpcomingHomeEvents(client);
  const supplemental = buildSupplementalFeedItems(upcoming, realTicketResultCount)
    .slice(0, cappedSupplementalCount);
  return dedupeFeedItemsByDetail([...realItems, ...supplemental]).slice(0, limit);
}

/** フィード表示用の短い日付（例: 7/12）。曜日は付けない */
export function fmtFeedDate(d: string | null): string {
  if (!d) return "日程未定";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}
