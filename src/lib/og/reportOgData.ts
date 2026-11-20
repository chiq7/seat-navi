import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import { fmtDate } from "@/lib/artistPageHelpers";
import type { CrawledEvent } from "@/lib/types";
import { EVENT_COLUMNS } from "@/lib/og/eventOgData";
import { AsyncLocalStorage } from "node:async_hooks";

const SEAT_AREA_LABELS: Record<string, string> = {
  arena: "アリーナ",
  stand_1f: "1階スタンド",
  stand_2f: "2階スタンド",
  stand_3f_or_higher: "3階以上",
  other_unknown: "その他",
};

type AfterReportRow = {
  id: string;
  event_id: string;
  seat_area_type: string | null;
  seat_description?: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_number: string | null;
  seat_view_photo_paths: string[] | null;
};

export type ReportOgInfo = {
  reportId: string;
  event: CrawledEvent;
  artistName: string | null;
  isTestData: boolean;
  dateLabel: string;
  /** 存在する座席情報だけを自然につないだ文字列（例: "アリーナ D3 4列2番"）。無ければnull */
  seatText: string | null;
  /** seat_view_photo_paths の1枚目（Storageパス）。無ければnull */
  photoPath: string | null;
};

// Share the Worker's status-code lookup with both the page and its metadata.
const reportForRequest = new AsyncLocalStorage<ReportOgInfo>();

export function withPublicReport<T>(report: ReportOgInfo, render: () => T) {
  return reportForRequest.run(report, render);
}

/**
 * OGP・generateMetadata共通: 現地レポ1件 + 紐づくevent + アーティスト情報をまとめて取得する。
 * 読み取り専用（DB書き込みなし）。/report/live/detail の表示ロジックは変更しない。
 */
export async function getReportOgInfo(reportId: string): Promise<ReportOgInfo | null> {
  const known = reportForRequest.getStore();
  if (known?.reportId === reportId) return known;
  const { data: reportData, error: reportError } = await supabase
    .from("after_reports")
    .select("id, event_id, seat_area_type, seat_description, seat_block, seat_row, seat_number, seat_view_photo_paths")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError) throw new Error("Public report lookup failed", { cause: reportError });
  if (!reportData) return null;
  const report = reportData as AfterReportRow;

  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", report.event_id)
    .maybeSingle();
  if (eventError) throw new Error("Public report event lookup failed", { cause: eventError });
  if (!eventData) return null;

  const event = eventData as CrawledEvent;
  const artist = resolveArtist(event);
  const { isTestData } = parseEventTitle(event.title, artist?.name);

  const areaLabel = report.seat_description?.trim() || (report.seat_area_type
    ? (SEAT_AREA_LABELS[report.seat_area_type] ?? report.seat_area_type)
    : null);
  const rowSeat = [
    report.seat_row ? `${report.seat_row}列` : null,
    report.seat_number ? `${report.seat_number}番` : null,
  ]
    .filter((v): v is string => Boolean(v))
    .join("");
  const seatParts = [areaLabel, report.seat_block || null, rowSeat || null].filter(
    (v): v is string => Boolean(v),
  );
  const seatText = seatParts.length > 0 ? seatParts.join(" ") : null;

  const photoPath = report.seat_view_photo_paths?.[0] ?? null;

  return {
    reportId,
    event,
    artistName: artist?.name ?? null,
    isTestData,
    dateLabel: fmtDate(event.date),
    seatText,
    photoPath,
  };
}
