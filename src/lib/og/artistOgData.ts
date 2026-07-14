import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug, type Artist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { parseEventTitle } from "@/lib/eventTitle";
import { computeTicketResultStats } from "@/lib/artistPageStats";
import type { TicketResultAnalytics } from "@/lib/artistPageTypes";

const TICKET_RESULT_COLUMNS =
  "id, event_id, result, lost_application_count, ticket_count, lottery_type, fc_history, payment_method, seat_type, upgrade_result, comment, seat_block, seat_row, seat_number, stand_direction, stand_floor, other_seat_info, created_at";

/** この件数未満の指標はOGPに数値を出さない（少数サンプルでの誤解を避けるため） */
const MIN_REPORTS_FOR_RATE = 10;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** サーバーのタイムゾーンに依存せず、日本時間基準の"YYYY-MM-DD"を返す */
function todayJST(): string {
  const jstMs = Date.now() + 9 * 60 * 60 * 1000;
  return new Date(jstMs).toISOString().split("T")[0];
}

/** HeroSection.tsx の fmtDateLabel と同じ表示形式（例: "08.01（土）"）をOGP用に複製 */
function fmtEventDateLabel(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const w = WEEKDAY_LABELS[new Date(y, m - 1, day).getDay()];
  return `${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}（${w}）`;
}

export type ArtistOgNextEvent = {
  venue: string;
  dateLabel: string;
  countdownDays: number;
};

export type ArtistOgInfo = {
  artist: Artist;
  /** HeroSection.tsxのtourTitleと同じ値。次の公演が無ければ"公演発表待機中" */
  tourTitle: string;
  /** HeroSection.tsxのdateRangeと同じ形式（例:"26.08.01"）。次の公演が無ければnull */
  dateRangeLabel: string | null;
  isTestData: boolean;
  ticketRate: number | null;
  normalArenaRate: number | null;
  upgradeRate: number | null;
  /** 現在日時(JST)以降で最も近い1公演。無ければnull */
  nextEvent: ArtistOgNextEvent | null;
};

/**
 * OGP・generateMetadata共通: アーティストの当落データを、アーティストTOPと同じ集計定義
 * （computeTicketResultStats）を再利用して取得する。読み取り専用（DB書き込みなし）。
 * /artists/[slug] の表示ロジックは変更しない。
 */
export async function getArtistOgInfo(slug: string): Promise<ArtistOgInfo | null> {
  const artist = findArtistBySlug(slug);
  if (!artist) return null;

  const events = await getEventsForArtist(artist.slug);
  if (events.length === 0) {
    return {
      artist,
      tourTitle: "公演発表待機中",
      dateRangeLabel: null,
      isTestData: false,
      ticketRate: null,
      normalArenaRate: null,
      upgradeRate: null,
      nextEvent: null,
    };
  }

  const today = todayJST();

  const upcomingEvents = events
    .filter((ev) => ev.date && ev.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const nextUpcoming = upcomingEvents[0] ?? null;

  // HeroSection.tsxと同じロジック: 次の公演が無い場合は「公演発表待機中」、isTestDataもfalse固定
  // （過去公演にフォールバックしてテストデータ判定はしない）
  const nextEventTitle = nextUpcoming ? parseEventTitle(nextUpcoming.title, artist.name) : null;
  const tourTitle = nextUpcoming === null ? "公演発表待機中" : (nextEventTitle?.tourName ?? artist.name);
  const isTestData = nextEventTitle?.isTestData ?? false;
  const dateRangeLabel = nextUpcoming?.date ? nextUpcoming.date.replace(/-/g, ".").slice(2) : null;

  const nextEvent: ArtistOgNextEvent | null =
    nextUpcoming && nextUpcoming.date
      ? {
          venue: nextUpcoming.venue,
          dateLabel: fmtEventDateLabel(nextUpcoming.date),
          countdownDays: Math.ceil(
            (new Date(nextUpcoming.date).getTime() - new Date(today).getTime()) / 86400000,
          ),
        }
      : null;

  const ids = events.map((e) => e.id);
  const { data } = await supabase
    .from("event_ticket_results")
    .select(TICKET_RESULT_COLUMNS)
    .in("event_id", ids)
    .limit(1000);
  const rows = (data as TicketResultAnalytics[]) ?? [];
  const stats = computeTicketResultStats(rows);

  return {
    artist,
    tourTitle,
    dateRangeLabel,
    isTestData,
    nextEvent,
    ticketRate: stats.total >= MIN_REPORTS_FOR_RATE ? stats.rate : null,
    normalArenaRate: stats.normalArenaCount >= MIN_REPORTS_FOR_RATE ? stats.normalArenaRate : null,
    upgradeRate: stats.upgradeCount >= MIN_REPORTS_FOR_RATE ? stats.upgradeRate : null,
  };
}
