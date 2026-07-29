import crypto from "node:crypto";
import { fetchPage, makeEventId, type AnySupabaseClient, type EventRow } from "@/lib/eventCrawler";

type OfficialTourSource = {
  id: string;
  artistSlug: string;
  artistTerms: readonly string[];
  genre: "johnnys";
  url: string;
  parser: "starto_live";
};

export type OfficialTourScheduleItem = {
  date: string;
  venue: string;
  venueId: string;
};

export type ParsedOfficialTour = {
  title: string;
  items: OfficialTourScheduleItem[];
};

export type OfficialTourSyncReport = {
  sourceId: string;
  sourceUrl: string;
  artistSlug: string;
  title: string | null;
  parsedDates: number;
  created: number;
  updated: number;
  skippedAmbiguous: number;
  error: string | null;
};

/**
 * STARTOの公演詳細は、画面用のHTMLとは別に `live_info_item` という構造化配列を埋め込む。
 * ここを読むことで、会場カレンダー側の短縮タイトルに依存せず、公式ツアー名へ統一できる。
 * 新ツアーが発表されたら、この配列へ公式の公演詳細URLを追加する。
 */
export const OFFICIAL_TOUR_SOURCES: readonly OfficialTourSource[] = [
  {
    id: "starto-timelesz-2026-momentum",
    artistSlug: "timelesz",
    artistTerms: ["timelesz", "タイムレス"],
    genre: "johnnys",
    url: "https://starto.jp/s/p/live/10431",
    parser: "starto_live",
  },
];

const STARTO_VENUE_IDS: Readonly<Record<string, string>> = {
  "Aichi Sky Expo（愛知県国際展示場）Aホール": "aichi-sky-expo",
  "エコパアリーナ": "ecopa-arena",
  "ららアリーナ 東京ベイ": "lalaarena-tokyo-bay",
  "横浜アリーナ": "yokohama-arena",
  "真駒内セキスイハイムアイスアリーナ": "makomanai-sekisuiheim-ice-arena",
  "大阪城ホール": "osaka-jo-hall",
  "マリンメッセ福岡A館": "marine-messe",
  "セキスイハイムスーパーアリーナ": "miyagi-arena",
};

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeStartoValue(value: string): string {
  return cleanHtml(value.replace(/\\"/g, '"').replace(/\\n/g, " ").replace(/\\\\/g, "\\"));
}

function readStartoField(record: string, field: string): string | null {
  const expression = `"${field}"\\s*:\\s*(?:"((?:\\\\.|[^\\"])*)"|` + "`([\\s\\S]*?)`)";
  const match = record.match(new RegExp(expression));
  const value = match?.[1] ?? match?.[2];
  return value === undefined ? null : decodeStartoValue(value);
}

function venueIdFor(venue: string): string {
  const known = STARTO_VENUE_IDS[venue];
  if (known) return known;
  const digest = crypto.createHash("sha256").update(venue, "utf8").digest("hex").slice(0, 12);
  return `official-venue-${digest}`;
}

function venueKey(venue: string): string {
  return venue.normalize("NFKC").replace(/\s+/g, "").trim();
}

function sourceSlotKey(date: string, venue: string): string {
  return `${date}::${venueKey(venue)}`;
}

/** STARTOの埋め込み `live_info_item` から、公演日ごとの会場情報を抽出する。 */
export function parseStartoLivePage(html: string): ParsedOfficialTour {
  const titleHtml = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = titleHtml ? cleanHtml(titleHtml) : "";
  if (!title) throw new Error("STARTO公式ページのツアー名を取得できませんでした");

  const payload = html.match(/(?:const|let|var)\s+live_info_item\s*=\s*\[([\s\S]*?)\]\s*;/)?.[1];
  if (!payload) throw new Error("STARTO公式ページの公演日程データを取得できませんでした");

  const items: OfficialTourScheduleItem[] = [];
  const seen = new Set<string>();
  for (const match of payload.matchAll(/\{([\s\S]*?)\}(?:\s*,|\s*$)/g)) {
    const record = match[1];
    const date = readStartoField(record, "str_itemDate");
    const venue = readStartoField(record, "str_itemPlace");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !venue) continue;

    const key = sourceSlotKey(date, venue);
    if (seen.has(key)) continue; // 同日昼夜の複数回公演は、ちけレポでは同じ公演日として扱う
    seen.add(key);
    items.push({ date, venue, venueId: venueIdFor(venue) });
  }

  if (items.length === 0) throw new Error("STARTO公式ページから有効な公演日程を取得できませんでした");
  return { title, items };
}

type ExistingEvent = Pick<EventRow, "id" | "title" | "venue" | "venue_id" | "date" | "genre" | "artist_slug">;

function isSourceArtist(event: ExistingEvent, source: OfficialTourSource): boolean {
  if (event.artist_slug === source.artistSlug) return true;
  const title = event.title.normalize("NFKC").toLocaleLowerCase("ja-JP");
  return source.artistTerms.some((term) => title.includes(term.normalize("NFKC").toLocaleLowerCase("ja-JP")));
}

/**
 * 公式ツアー情報を、既存公演の正式タイトル補正と不足日程の追加に使う。
 * 会場・日付が一致する別アーティストの公演は自動更新せず、保留扱いにする。
 */
export async function syncOfficialTourSources(
  sb: AnySupabaseClient,
  dryRun: boolean,
): Promise<OfficialTourSyncReport[]> {
  const reports: OfficialTourSyncReport[] = [];

  for (const source of OFFICIAL_TOUR_SOURCES) {
    const page = await fetchPage(source.url);
    if (!page.html) {
      reports.push({
        sourceId: source.id,
        sourceUrl: source.url,
        artistSlug: source.artistSlug,
        title: null,
        parsedDates: 0,
        created: 0,
        updated: 0,
        skippedAmbiguous: 0,
        error: page.error ?? `HTTP ${page.status}`,
      });
      continue;
    }

    try {
      const parsed = parseStartoLivePage(page.html);
      const dates = [...new Set(parsed.items.map((item) => item.date))];
      const { data, error } = await sb
        .from("events")
        .select("id,title,venue,venue_id,date,genre,artist_slug")
        .in("date", dates);
      if (error) throw new Error(`既存公演の照合に失敗しました: ${error.message}`);

      const existing = (data ?? []) as ExistingEvent[];
      const newRows: EventRow[] = [];
      const updates: ExistingEvent[] = [];
      let skippedAmbiguous = 0;

      for (const item of parsed.items) {
        const sameSlot = existing.filter((event) => event.date === item.date && venueKey(event.venue) === venueKey(item.venue));
        const artistMatches = sameSlot.filter((event) => isSourceArtist(event, source));

        if (artistMatches.length === 1) {
          const event = artistMatches[0];
          if (event.title !== parsed.title || event.genre !== source.genre || event.artist_slug !== source.artistSlug) {
            updates.push(event);
          }
          continue;
        }

        if (artistMatches.length > 1 || sameSlot.length > 0) {
          skippedAmbiguous += 1;
          continue;
        }

        newRows.push({
          id: makeEventId(item.venueId, item.date, parsed.title),
          title: parsed.title,
          venue: item.venue,
          venue_id: item.venueId,
          date: item.date,
          genre: source.genre,
          artist_slug: source.artistSlug,
        });
      }

      if (!dryRun && newRows.length > 0) {
        const { error: insertError } = await sb.from("events").upsert(newRows, { onConflict: "id" });
        if (insertError) throw new Error(`不足公演の保存に失敗しました: ${insertError.message}`);
      }
      if (!dryRun) {
        for (const event of updates) {
          const { error: updateError } = await sb
            .from("events")
            .update({ title: parsed.title, genre: source.genre, artist_slug: source.artistSlug })
            .eq("id", event.id);
          if (updateError) throw new Error(`公演タイトルの更新に失敗しました: ${updateError.message}`);
        }
      }

      reports.push({
        sourceId: source.id,
        sourceUrl: source.url,
        artistSlug: source.artistSlug,
        title: parsed.title,
        parsedDates: parsed.items.length,
        created: newRows.length,
        updated: updates.length,
        skippedAmbiguous,
        error: null,
      });
    } catch (error) {
      reports.push({
        sourceId: source.id,
        sourceUrl: source.url,
        artistSlug: source.artistSlug,
        title: null,
        parsedDates: 0,
        created: 0,
        updated: 0,
        skippedAmbiguous: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return reports;
}
