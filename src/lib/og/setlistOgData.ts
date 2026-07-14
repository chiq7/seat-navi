import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug, type Artist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { parseEventTitle } from "@/lib/eventTitle";
import { fmtDate } from "@/lib/artistPageHelpers";
import type { CrawledEvent } from "@/lib/types";

type SetlistItemRow = { type?: string };

export type SetlistOgInfo = {
  artist: Artist;
  /** 対象公演（次の1公演 → 無ければ直近過去公演）。公演が1件もない場合はnull */
  event: CrawledEvent | null;
  tourName: string | null;
  isTestData: boolean;
  dateLabel: string | null;
  songCount: number;
};

/**
 * OGP・generateMetadata共通: セトリOGPの対象公演を決定し、曲数を取得する。
 * 対象公演の決め方: 現在日時以降の公演を日付昇順で1件（次の公演） → 無ければ現在日時より前を日付降順で1件（直近過去公演）。
 * 読み取り専用（DB書き込みなし）。/artists/[slug]/setlist の表示ロジック・選択状態は変更しない。
 */
export async function getSetlistOgInfo(slug: string): Promise<SetlistOgInfo | null> {
  const artist = findArtistBySlug(slug);
  if (!artist) return null;

  const events = await getEventsForArtist(artist.slug);
  const today = new Date().toISOString().split("T")[0];

  const nextEvent = events
    .filter((ev) => ev.date && ev.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0];
  const pastEvent = events
    .filter((ev) => ev.date && ev.date < today)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
  const targetEvent = nextEvent ?? pastEvent ?? null;

  if (!targetEvent) {
    return { artist, event: null, tourName: null, isTestData: false, dateLabel: null, songCount: 0 };
  }

  const { tourName, isTestData } = parseEventTitle(targetEvent.title, artist.name);

  const { data } = await supabase
    .from("setlists")
    .select("items")
    .eq("event_id", targetEvent.id)
    .maybeSingle();

  const items = (data?.items as SetlistItemRow[] | null) ?? [];
  const songCount = items.filter((item) => item?.type === "song").length;

  return {
    artist,
    event: targetEvent,
    tourName,
    isTestData,
    dateLabel: fmtDate(targetEvent.date),
    songCount,
  };
}
