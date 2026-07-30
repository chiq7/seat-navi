import crypto from "node:crypto";
import { fetchPage, makeEventId, type AnySupabaseClient, type EventRow } from "@/lib/eventCrawler";

type StartoOfficialTourSource = {
  id: string;
  artistSlug: string;
  artistTerms: readonly string[];
  genre: string;
  url: string;
  parser: "starto_live";
};

type StaticOfficialTourSource = {
  id: string;
  artistSlug: string;
  artistTerms: readonly string[];
  genre: string;
  /** 公式発表のURL。日程を確認して手動登録するソースも、このURLを根拠として保持する。 */
  url: string;
  parser: "static";
  title: string;
  items: readonly OfficialTourScheduleItem[];
};

type OfficialTourSource = StartoOfficialTourSource | StaticOfficialTourSource;

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
  {
    id: "bullet-train-2026-tokyo-dome",
    artistSlug: "bullet-train",
    artistTerms: ["超特急", "bullet train"],
    genre: "male_idol",
    url: "https://bullettrain.jp/live/live25696/",
    parser: "static",
    title: "超特急 東京ドーム公演",
    items: [
      { date: "2026-11-25", venue: "東京ドーム", venueId: "tokyo-dome" },
      { date: "2026-11-26", venue: "東京ドーム", venueId: "tokyo-dome" },
    ],
  },
  {
    id: "kis-my-ft2-2026-fan-is",
    artistSlug: "kis-my-ft2",
    artistTerms: ["kis-my-ft2", "キスマイ"],
    genre: "johnnys",
    url: "https://mentrecording.jp/kismyft2/live/tour.php?id=1002973",
    parser: "static",
    title: "Kis-My-Ft2 LIVE TOUR 2026 fan IS ･･････",
    items: [
      { date: "2026-08-03", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
      { date: "2026-08-04", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
    ],
  },
  {
    id: "le-sserafim-2026-pureflow",
    artistSlug: "le-sserafim",
    artistTerms: ["le sserafim", "ルセラフィム"],
    genre: "kpop",
    url: "https://www.le-sserafim.jp/news/15da601c7f27",
    parser: "static",
    title: "2026 LE SSERAFIM TOUR 'PUREFLOW' IN JAPAN",
    items: [
      { date: "2026-07-25", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
      { date: "2026-07-26", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
      { date: "2026-07-30", venue: "Kアリーナ横浜", venueId: "k-arena" },
      { date: "2026-08-18", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
      { date: "2026-08-19", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
    ],
  },
  {
    id: "naniwa-danshi-2026-nd5",
    artistSlug: "naniwa-danshi",
    artistTerms: ["なにわ男子", "naniwa danshi"],
    genre: "johnnys",
    url: "https://web.storm-labels.co.jp/s/st/news/detail/14577?ima=2438",
    parser: "static",
    title: "なにわ男子 LIVE TOUR 2026「ND⁵」",
    items: [
      { date: "2026-07-28", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
      { date: "2026-07-29", venue: "大阪城ホール", venueId: "osaka-jo-hall" },
      { date: "2026-08-15", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
      { date: "2026-08-16", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
    ],
  },
  {
    id: "news-2026-kmk-miyagi",
    artistSlug: "news",
    artistTerms: ["news"],
    genre: "johnnys",
    url: "https://starto.jp/s/p/live/10507",
    parser: "static",
    title: "NEWS LIVE TOUR 2026 /// KMK",
    items: [
      { date: "2026-09-05", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
      { date: "2026-09-06", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
    ],
  },
  {
    id: "one-ok-rock-2026-detox-japan-tour-final",
    artistSlug: "one-ok-rock",
    artistTerms: ["one ok rock"],
    genre: "other",
    url: "https://www.oneokrock.com/jp/news/5036",
    parser: "static",
    title: "ONE OK ROCK DETOX JAPAN TOUR FINAL 2026",
    items: [
      { date: "2026-08-25", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
      { date: "2026-08-26", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
    ],
  },
  {
    id: "sakurazaka46-2026-whats-lonesome",
    artistSlug: "sakurazaka46",
    artistTerms: ["櫻坂46", "sakurazaka46"],
    genre: "female_idol",
    url: "https://sakurazaka46.com/s/s46/page/nationaltour2026?ima=0000",
    parser: "static",
    title: "Sakurazaka46 ARENA TOUR 2026 -What’s lonesome?-",
    items: [
      { date: "2026-07-29", venue: "神戸ワールド記念ホール", venueId: "kobe-world-hall" },
      { date: "2026-08-08", venue: "広島グリーンアリーナ", venueId: "hiroshima-arena" },
      { date: "2026-08-09", venue: "広島グリーンアリーナ", venueId: "hiroshima-arena" },
      { date: "2026-08-22", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
      { date: "2026-08-23", venue: "セキスイハイムスーパーアリーナ", venueId: "miyagi-arena" },
    ],
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
    try {
      let parsed: ParsedOfficialTour;
      if (source.parser === "static") {
        // 公式ページを確認した時点の確定日程。毎回のHTTP取得に依存せず、
        // 会場カレンダーの短縮タイトルを確実に補正できるようにする。
        parsed = { title: source.title, items: [...source.items] };
      } else {
        const page = await fetchPage(source.url);
        if (!page.html) throw new Error(page.error ?? `HTTP ${page.status}`);
        parsed = parseStartoLivePage(page.html);
      }
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
