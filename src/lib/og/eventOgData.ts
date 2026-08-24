import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist, type Artist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import { fmtDate } from "@/lib/artistPageHelpers";
import type { CrawledEvent } from "@/lib/types";

export const EVENT_COLUMNS = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";

/** /events/[id] の座席報告マップと同じ「同一会場×近接日程(3日以内)」統合ルール */
const ADJACENT_GAP_DAYS = 3;

const SEAT_REPORT_COLUMNS = "block, row_num, seat_num, lottery_type, fc_history, payment_method";

export type EventOgInfo = {
  event: CrawledEvent;
  artist: Artist | undefined;
  tourName: string;
  isTestData: boolean;
  dateLabel: string;
};

export type MiniSeatRow = {
  block: string;
  row_num: number;
  seat_num: number;
  lottery_type: string;
  fc_history?: string | null;
  payment_method?: string | null;
};

/**
 * OGP・generateMetadata共通: event行取得 + アーティスト解決 + タイトルパースをまとめて行う。
 * 読み取り専用（DB書き込みなし）。
 */
export async function getEventWithArtist(eventId: string): Promise<EventOgInfo | null> {
  return queryEventWithArtist(supabase, eventId);
}

export async function queryEventWithArtist(
  client: SupabaseClient,
  eventId: string,
): Promise<EventOgInfo | null> {
  const { data } = await client.from("events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle();
  if (!data) return null;
  const event = data as CrawledEvent;
  const artist = resolveArtist(event);
  const { tourName, isTestData } = parseEventTitle(event.title, artist?.name);
  return { event, artist, tourName, isTestData, dateLabel: fmtDate(event.date) };
}

/**
 * 同一会場・近接日程（3日以内）でつながる公演群のevent_id配列を返す。
 * src/app/events/[id]/page.tsx 内の groupEventIds と同じロジックをOGP用に複製したもの。
 * 既存のクライアント側ロジック（マップ描画・保存処理）は変更しない。
 */
export async function getGroupedEventIds(
  event: CrawledEvent,
  artistSlug: string | null,
): Promise<string[]> {
  return queryGroupedEventIds(supabase, event, artistSlug);
}

export async function queryGroupedEventIds(
  client: SupabaseClient,
  event: CrawledEvent,
  artistSlug: string | null,
): Promise<string[]> {
  if (!event.venue_id) return [event.id];

  const { data } = await client.from("events").select(EVENT_COLUMNS).eq("venue_id", event.venue_id);
  const venueEvents = ((data as CrawledEvent[]) ?? []).filter((ev) => ev.date);
  const sameArtist = artistSlug
    ? venueEvents.filter((ev) => (ev.artist_slug ?? resolveArtist(ev)?.slug) === artistSlug)
    : venueEvents;

  const sorted = [...sameArtist].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const groups: CrawledEvent[][] = [];
  let current: CrawledEvent[] = [];
  for (const ev of sorted) {
    if (current.length === 0) {
      current = [ev];
      continue;
    }
    const prevDate = current[current.length - 1].date!;
    const gapDays = Math.round(
      (new Date(ev.date!).getTime() - new Date(prevDate).getTime()) / 86400000,
    );
    if (gapDays <= ADJACENT_GAP_DAYS) {
      current.push(ev);
    } else {
      groups.push(current);
      current = [ev];
    }
  }
  if (current.length > 0) groups.push(current);

  const myGroup = groups.find((g) => g.some((ev) => ev.id === event.id));
  return myGroup ? myGroup.map((ev) => ev.id) : [event.id];
}

/** 座席報告の件数のみを軽量に取得（count head query、行データは取得しない） */
export async function getSeatReportCount(groupedIds: string[]): Promise<number> {
  return querySeatReportCount(supabase, groupedIds);
}

export async function querySeatReportCount(client: SupabaseClient, groupedIds: string[]): Promise<number> {
  const { count } = await client
    .from("seat_reports")
    .select("*", { count: "exact", head: true })
    .in("event_id", groupedIds);
  return count ?? 0;
}

/** OGPマップ描画用に座席報告の行データを取得（描画負荷を抑えるためlimit付き） */
export async function getSeatReportRows(groupedIds: string[], limit = 300): Promise<MiniSeatRow[]> {
  const { data } = await supabase
    .from("seat_reports")
    .select(SEAT_REPORT_COLUMNS)
    .in("event_id", groupedIds)
    .limit(limit);
  return (data as MiniSeatRow[]) ?? [];
}

/** 座席予想（承認済み）の件数のみを軽量に取得。この公演単体のみ（マップとは異なりグルーピングしない） */
export async function getPredictionCount(eventId: string): Promise<number> {
  return queryPredictionCount(supabase, eventId);
}

export async function queryPredictionCount(client: SupabaseClient, eventId: string): Promise<number> {
  const { count } = await client
    .from("fan_seat_predictions")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("approved", true);
  return count ?? 0;
}

/** prediction指定時: 指定IDが「この公演」に属する承認済み投稿かを確認する */
export async function getValidPrediction(
  eventId: string,
  predictionId: string,
): Promise<{ id: string; image_path: string } | null> {
  const { data } = await supabase
    .from("fan_seat_predictions")
    .select("id, image_path")
    .eq("id", predictionId)
    .eq("event_id", eventId)
    .eq("approved", true)
    .maybeSingle();
  return data ?? null;
}
