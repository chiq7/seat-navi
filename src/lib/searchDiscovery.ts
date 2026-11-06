import { SEARCH_VENUE_CATALOG, type SearchVenueCatalogEntry } from "@/data/searchVenueCatalog";
import { findArtistBySlug, resolveArtist } from "@/lib/artists";
import { isArtistOnlyEventTitle, parseEventTitle } from "@/lib/eventTitle";
import { normalizeForSearch } from "@/lib/keywordMatch";
import { getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import { eventMatchesSearchVenue } from "@/lib/searchVenueMatch";
import type { CrawledEvent } from "@/lib/types";

export type SearchRegion = {
  id: string;
  label: string;
  aliases: readonly string[];
  prefectures: readonly string[];
  locality?: string;
};

const PREFECTURE_NAMES = [
  ["北海道", "ほっかいどう"], ["青森県", "あおもり"], ["岩手県", "いわて"], ["宮城県", "みやぎ"],
  ["秋田県", "あきた"], ["山形県", "やまがた"], ["福島県", "ふくしま"], ["茨城県", "いばらき"],
  ["栃木県", "とちぎ"], ["群馬県", "ぐんま"], ["埼玉県", "さいたま"], ["千葉県", "ちば"],
  ["東京都", "とうきょう"], ["神奈川県", "かながわ"], ["新潟県", "にいがた"], ["富山県", "とやま"],
  ["石川県", "いしかわ"], ["福井県", "ふくい"], ["山梨県", "やまなし"], ["長野県", "ながの"],
  ["岐阜県", "ぎふ"], ["静岡県", "しずおか"], ["愛知県", "あいち"], ["三重県", "みえ"],
  ["滋賀県", "しが"], ["京都府", "きょうと"], ["大阪府", "おおさか"], ["兵庫県", "ひょうご"],
  ["奈良県", "なら"], ["和歌山県", "わかやま"], ["鳥取県", "とっとり"], ["島根県", "しまね"],
  ["岡山県", "おかやま"], ["広島県", "ひろしま"], ["山口県", "やまぐち"], ["徳島県", "とくしま"],
  ["香川県", "かがわ"], ["愛媛県", "えひめ"], ["高知県", "こうち"], ["福岡県", "ふくおか"],
  ["佐賀県", "さが"], ["長崎県", "ながさき"], ["熊本県", "くまもと"], ["大分県", "おおいた"],
  ["宮崎県", "みやざき"], ["鹿児島県", "かごしま"], ["沖縄県", "おきなわ"],
] as const;
const prefectureKey = (name: string) => name.replace(/[都府県]$/, "");

const AREA_REGIONS: SearchRegion[] = [
  { id: "tohoku", label: "東北", aliases: ["東北", "東北地方", "とうほく"], prefectures: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  { id: "kanto", label: "関東", aliases: ["関東", "関東地方", "かんとう"], prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
  { id: "hokuriku", label: "北陸", aliases: ["北陸", "北陸地方", "ほくりく"], prefectures: ["新潟県", "富山県", "石川県", "福井県"] },
  { id: "koshinetsu", label: "甲信越", aliases: ["甲信越", "甲信越地方", "こうしんえつ"], prefectures: ["山梨県", "長野県", "新潟県"] },
  { id: "tokai", label: "東海", aliases: ["東海", "東海地方", "とうかい"], prefectures: ["愛知県", "岐阜県", "三重県", "静岡県"] },
  { id: "kansai", label: "関西", aliases: ["関西", "近畿", "近畿地方", "かんさい", "きんき"], prefectures: ["大阪府", "京都府", "兵庫県", "奈良県", "滋賀県", "和歌山県"] },
  { id: "chugoku", label: "中国地方", aliases: ["中国地方", "ちゅうごくちほう"], prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
  { id: "shikoku", label: "四国", aliases: ["四国", "四国地方", "しこく"], prefectures: ["徳島県", "香川県", "愛媛県", "高知県"] },
  { id: "kyushu", label: "九州", aliases: ["九州", "九州地方", "きゅうしゅう"], prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"] },
];

const CITY_REGIONS: SearchRegion[] = [
  { id: "sapporo", label: "札幌", aliases: ["札幌", "札幌市", "さっぽろ", "さっぽろし"], prefectures: ["北海道"], locality: "札幌市" },
  { id: "sendai", label: "仙台", aliases: ["仙台", "仙台市", "せんだい", "せんだいし"], prefectures: ["宮城県"], locality: "仙台市" },
  { id: "yokohama", label: "横浜", aliases: ["横浜", "横浜市", "よこはま", "よこはまし"], prefectures: ["神奈川県"], locality: "横浜市" },
  { id: "nagoya", label: "名古屋", aliases: ["名古屋", "名古屋市", "なごや", "なごやし"], prefectures: ["愛知県"], locality: "名古屋市" },
  { id: "niigata-city", label: "新潟市", aliases: ["新潟市", "にいがたし"], prefectures: ["新潟県"], locality: "新潟市" },
  { id: "osaka-city", label: "大阪市", aliases: ["大阪市", "おおさかし"], prefectures: ["大阪府"], locality: "大阪市" },
  { id: "hiroshima-city", label: "広島市", aliases: ["広島市", "ひろしまし"], prefectures: ["広島県"], locality: "広島市" },
  { id: "fukuoka-city", label: "福岡市", aliases: ["福岡市", "ふくおかし"], prefectures: ["福岡県"], locality: "福岡市" },
];

/** A city never inherits all venues in its prefecture or a combined directory region. */
export const SEARCH_REGIONS: readonly SearchRegion[] = [
  ...PREFECTURE_NAMES.map(([name, reading]) => ({
    id: `pref-${prefectureKey(name)}`, label: prefectureKey(name), prefectures: [name],
    aliases: [...new Set([name, prefectureKey(name), reading, name === "北海道" ? reading : `${reading}${name.endsWith("都") ? "と" : name.endsWith("府") ? "ふ" : "けん"}`])],
  })),
  ...AREA_REGIONS,
  ...CITY_REGIONS,
];

export const SEARCH_CONTENT_INTENTS = [
  { id: "seat", label: "席・座席表", terms: ["席", "座席", "座席表", "座席番号", "席番号", "座席番号の見方", "座席番号見方", "見方", "席の場所", "シートマップ", "せき", "ざせき", "ざせきひょう", "席種", "アリーナ", "アリーナ席", "スタンド", "スタンド席"] },
  { id: "view", label: "席からの見え方・写真", terms: ["見え方", "席からの見え方", "座席の見え方", "席からの写真", "座席写真", "みえかた"] },
  { id: "setlist", label: "セットリスト", terms: ["セトリ", "セットリスト", "曲順", "setlist"] },
  { id: "reports", label: "現地レポ", terms: ["現地レポ", "現地レポート", "ライブレポ", "ライブレポート", "レポ", "感想", "げんちれぽ"] },
  { id: "ticket", label: "当落・当選率", terms: ["当落", "当落結果", "当選率", "当選確率", "抽選結果", "当選", "落選", "倍率", "とうらく", "とうせんりつ"] },
  { id: "prediction", label: "アリーナ予想", terms: ["アリーナ予想", "アリーナ予想図", "アリーナ座席予想", "座席予想", "座席予想図", "アリーナ配置"] },
  { id: "access", label: "アクセス", terms: ["アクセス", "行き方", "最寄り駅", "最寄り", "道順", "いきかた", "もよりえき"] },
  { id: "facilities", label: "会場の設備", terms: ["設備", "トイレ", "お手洗い", "売店", "飲食", "グルメ", "せつび"] },
  { id: "luggage", label: "ロッカー・荷物", terms: ["ロッカー", "コインロッカー", "荷物", "荷物預かり", "荷物預け", "クローク", "にもつ"] },
  { id: "schedule", label: "公演日程", terms: ["公演日程", "公演予定", "開催予定", "公演日", "日程", "スケジュール", "ライブ情報", "にってい"] },
  { id: "news", label: "公式ニュース", terms: ["公式ニュース", "公式NEWS", "ニュース", "news", "公式情報"] },
  { id: "capacity", label: "キャパ・収容人数", terms: ["キャパ", "キャパシティ", "収容人数", "収容数"] },
] as const;
export type SearchContentIntent = typeof SEARCH_CONTENT_INTENTS[number]["id"];
export const SEARCH_DISCOVERY_INTENT_TERMS: readonly string[] = SEARCH_CONTENT_INTENTS.flatMap(intent => [...intent.terms]);

const DISCOVERY_NAMES = [
  ...SEARCH_REGIONS.flatMap(region => region.aliases.map(term => ({ kind: "region" as const, id: region.id, term: normalizeForSearch(term) }))),
  ...SEARCH_CONTENT_INTENTS.flatMap(intent => intent.terms.map(term => ({ kind: "intent" as const, id: intent.id, term: normalizeForSearch(term) }))),
  ...["ライブ", "コンサート", "公演", "会場"].map(term => ({ kind: "neutral" as const, id: term, term: normalizeForSearch(term) })),
].sort((a, b) => b.term.length - a.term.length);

/** Called after complete entity names are consumed; unknown words remain AND constraints. */
export function parseDiscoveryTerms(terms: readonly string[]): { regionIds: string[]; intentIds: SearchContentIntent[]; remainder: string[] } {
  const regions = new Set<string>();
  const intents = new Set<SearchContentIntent>();
  const remainder: string[] = [];
  const parts = terms.flatMap(term => term.split(/\s+/)).filter(Boolean);
  for (let index = 0; index < parts.length; index++) {
    let value = normalizeForSearch(parts[index]);
    // Only join known complete labels (セット リスト / 中国 地方), never arbitrary words.
    for (let count = Math.min(3, parts.length - index); count >= 2; count--) {
      const joined = normalizeForSearch(parts.slice(index, index + count).join(""));
      if (!DISCOVERY_NAMES.some(item => item.term === joined)) continue;
      value = joined;
      index += count - 1;
      break;
    }
    const original = value;
    const tokenRegions: string[] = [];
    let changed = false;
    while (value) {
      if (changed) value = value.replace(/^の|の$/g, "");
      const match = DISCOVERY_NAMES.find(item => value.startsWith(item.term) || value.endsWith(item.term));
      if (!match) break;
      if (match.kind === "region") tokenRegions.push(match.id);
      if (match.kind === "intent") intents.add(match.id as SearchContentIntent);
      value = value.startsWith(match.term) ? value.slice(match.term.length) : value.slice(0, -match.term.length);
      changed = true;
    }
    if (value && tokenRegions.length) {
      // 東京タワー is an unknown name, not an explicit 東京 constraint.
      // Keep its full text while still allowing a separate trailing intent.
      value = original;
      let previous;
      do {
        previous = value;
        const match = DISCOVERY_NAMES.find(item => item.kind !== "region" && (value.startsWith(item.term) || value.endsWith(item.term)));
        if (match) value = (value.startsWith(match.term) ? value.slice(match.term.length) : value.slice(0, -match.term.length)).replace(/^の|の$/g, "");
      } while (previous !== value);
    } else tokenRegions.forEach(id => regions.add(id));
    if (value && value !== "の") remainder.push(value);
  }
  return { regionIds: [...regions], intentIds: [...intents], remainder: [...new Set(remainder)] };
}

export function matchesSearchRegions(venue: Pick<SearchVenueCatalogEntry, "prefecture" | "locality" | "kind">, regionIds: readonly string[]): boolean {
  if (!regionIds.length) return true;
  if (venue.kind !== "venue" || !venue.prefecture) return false;
  return regionIds.every(id => {
    const region = SEARCH_REGIONS.find(candidate => candidate.id === id);
    if (!region || !region.prefectures.some(name => prefectureKey(name) === prefectureKey(venue.prefecture!))) return false;
    return !region.locality || Boolean(venue.locality?.startsWith(region.locality));
  });
}

export type SearchDiscoveryContext = {
  artistSlugs: readonly string[];
  venueIds: readonly string[];
  regionIds?: readonly string[];
  intentIds?: readonly SearchContentIntent[];
  remainder?: readonly string[];
  dates?: readonly string[];
  events?: readonly CrawledEvent[];
};
export type SearchDiscoveryResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: "venue" | "artist" | "event" | "guide";
};

const eventBelongsToVenue = eventMatchesSearchVenue;

/** Pure destination selection. It does not claim that reports, photos, or predictions exist. */
export function getSearchDiscoveryResults(query: string, context: SearchDiscoveryContext, limit = 12): SearchDiscoveryResult[] {
  const parsed = parseDiscoveryTerms(context.remainder ?? [query]);
  const intentIds = context.intentIds ?? parsed.intentIds;
  const regionIds = context.regionIds ?? parsed.regionIds;
  if (!intentIds.length) return [];
  const venues = SEARCH_VENUE_CATALOG.filter(venue => (!context.venueIds.length || context.venueIds.includes(venue.id))
    && matchesSearchRegions(venue, regionIds));
  const hasVenueScope = context.venueIds.length > 0 || regionIds.length > 0;
  const hasDateScope = Boolean(context.dates?.length);
  const events = (context.events ?? []).filter(event => {
    const artist = resolveArtist(event);
    if (event.artist_slug === "test" || parseEventTitle(event.title, artist?.name).isTestData || isArtistOnlyEventTitle(event.title, artist?.name)) return false;
    if (context.artistSlugs.length && (!artist || !context.artistSlugs.includes(artist.slug))) return false;
    if (hasDateScope && (!event.date || !context.dates!.includes(event.date))) return false;
    return !hasVenueScope || venues.some(venue => eventBelongsToVenue(event, venue));
  });
  const unknown = parsed.remainder.length > 0;
  const scopedEvents = hasVenueScope || unknown || hasDateScope;
  const artistSlugs = scopedEvents ? [...new Set(events.flatMap(event => {
    const artist = resolveArtist(event);
    return artist ? [artist.slug] : [];
  }))] : [...context.artistSlugs];
  const artists = artistSlugs.map(findArtistBySlug).filter((artist): artist is NonNullable<typeof artist> => Boolean(artist) && artist!.slug !== "test");
  const result = new Map<string, SearchDiscoveryResult>();
  const add = (row: Omit<SearchDiscoveryResult, "id">) => {
    if (!result.has(row.href)) result.set(row.href, { ...row, id: row.href });
  };
  const addEvent = (event: CrawledEvent, label: string, description: string, anchor = "") => add({
    kind: "event", href: `/events/${encodeURIComponent(event.id)}${anchor}`, title: `${event.date ?? "日程未定"} ${event.venue}｜${label}`, description,
  });

  for (const intent of intentIds) {
    const venueFunction = ["access", "facilities", "luggage", "capacity"].includes(intent);
    const useEventVenues = events.length > 0 && (unknown || hasDateScope || (context.artistSlugs.length > 0 && venueFunction));
    if (["seat", "access", "facilities", "luggage", "capacity", "schedule"].includes(intent) && (hasVenueScope || useEventVenues) && (!unknown || events.length > 0)) {
      for (const venue of venues) {
        if ((context.artistSlugs.length || unknown || hasDateScope) && !events.some(event => eventBelongsToVenue(event, venue))) continue;
        const guideId = venue.guideId;
        const seatHref = getPublicVenueSeatGuideHref(guideId);
        if (!guideId || !seatHref) {
          const rows = events.filter(event => eventBelongsToVenue(event, venue));
          const description = venueFunction
            ? "この会場の専用ガイドは未掲載です。公演の公式案内から必要な情報を確認してください。"
            : "公演日と使用会場を確かめて、掲載されている案内を確認できます。";
          const anchor = intent === "schedule" ? "" : "#performance-seat-links";
          if (rows.length) (intent === "schedule" ? rows : rows.slice(0, 1)).forEach(event => addEvent(event, "公演・公式案内", description, anchor));
          else if (!context.artistSlugs.length && !unknown && !hasDateScope && venue.eventIds[0]) add({ kind: "event", href: `/events/${venue.eventIds[0]}${anchor}`, title: `${venue.name}の公演・公式案内`, description });
          continue;
        }
        if (intent === "seat") add({ kind: "venue", href: seatHref, title: `${venue.name}の座席表`, description: "会場の座席案内を確認。公演ごとの仮設配置は、当日の公式案内と照合してください。" });
        if (intent === "access") add({ kind: "venue", href: `/venues/${guideId}#${guideId === "tokyo-dome" ? "dome-access" : "venue-access"}`, title: `${venue.name}へのアクセス`, description: "最寄り駅と会場へ向かう案内を確認できます。" });
        if (intent === "facilities" || intent === "luggage") add({ kind: "venue", href: `/venues/${guideId}#${guideId === "tokyo-dome" ? "dome-spots" : "venue-facilities"}`, title: `${venue.name}の設備・荷物案内`, description: "会場ガイドに掲載された設備と利用条件を確認できます。空き状況は当日確認してください。" });
        if (intent === "capacity") add({ kind: "venue", href: `/venues/${guideId}`, title: `${venue.name}の会場ガイド`, description: "会場の規模や座席区画を確認。公演ごとの使用席数とは異なります。" });
        if (intent === "schedule") add({ kind: "venue", href: `/venues/${guideId}#upcoming-events-title`, title: `${venue.name}の公演予定`, description: "登録されている開催予定の公演を確認できます。" });
      }
    }
    for (const artist of artists) {
      const base = `/artists/${artist.slug}`;
      const description = `${artist.name}の公演日・会場を選び、投稿状況を確認できます。`;
      if (intent === "setlist") {
        const rows = scopedEvents ? events.filter(event => resolveArtist(event)?.slug === artist.slug) : [];
        if (rows.length) rows.forEach(event => add({ kind: "event", href: `${base}/setlist?event=${encodeURIComponent(event.id)}`, title: `${artist.name} ${event.date ?? "日程未定"} ${event.venue}のセットリスト`, description: "選んだ公演のセットリストを確認。未投稿の場合はその状態が表示されます。" }));
        else add({ kind: "artist", href: `${base}/setlist`, title: `${artist.name}のセットリスト`, description });
      }
      if (intent === "reports" || intent === "view") {
        const rows = scopedEvents ? events.filter(event => resolveArtist(event)?.slug === artist.slug) : [];
        if (rows.length) rows.forEach(event => add({ kind: "event", href: `${base}/after-reports?event=${encodeURIComponent(event.id)}`, title: `${artist.name} ${event.date ?? "日程未定"} ${event.venue}の現地レポ・写真`, description: "選んだ公演の現地レポと写真の投稿状況を確認できます。" }));
        else add({ kind: "artist", href: `${base}/after-reports`, title: `${artist.name}の現地レポ・席からの写真`, description });
      }
      if (intent === "ticket") add({ kind: "artist", href: `${base}#ticket-data`, title: `${artist.name}の当落・当選率`, description: "ファンの報告に基づく集計です。公式の当選確率や全応募者の結果ではありません。" });
      if (intent === "news") add({ kind: "artist", href: `${base}/news`, title: `${artist.name}の公式ニュース`, description: "掲載ニュースから公式発表元を確認できます。" });
      if (intent === "schedule" && !hasVenueScope) add({ kind: "artist", href: `${base}#upcoming-events`, title: `${artist.name}の公演日程`, description: "登録されている開催予定の公演を確認できます。" });
      if (intent === "seat" && !hasVenueScope) add({ kind: "artist", href: base, title: `${artist.name}の公演・座席案内`, description: "行く公演を選んで、座席表や公式案内を確認できます。" });
      if (intent === "prediction" && !scopedEvents) add({ kind: "artist", href: base, title: `${artist.name}の公演別アリーナ予想`, description: "公演を選んで、予想図の投稿状況を確認できます。" });
    }
    if (intent === "prediction" && scopedEvents) events.forEach(event => addEvent(event, "座席・アリーナ予想の投稿状況", "ファンの予想図は公式配置とは異なります。未投稿の場合はその状態が表示されます。"));

    if (!context.artistSlugs.length && !hasVenueScope && !unknown && !hasDateScope) {
      if (["seat", "access", "facilities", "luggage", "capacity"].includes(intent)) add({ kind: "guide", href: "/venues", title: `会場の${SEARCH_CONTENT_INTENTS.find(item => item.id === intent)?.label}を探す`, description: "会場を選んで、公開されているガイドを確認できます。" });
      else if (intent === "schedule") add({ kind: "guide", href: "/", title: "開催予定の公演・アーティストを探す", description: "公演やアーティストを選んで日程を確認できます。" });
      else if (intent === "news") add({ kind: "guide", href: "/about", title: "アーティストの公式ニュースの探し方", description: "公演・アーティストの情報をつなぐ仕組みと、出典の確認方法を紹介します。" });
      else add({ kind: "guide", href: "/news/how-to-use-tixrepo", title: `${SEARCH_CONTENT_INTENTS.find(item => item.id === intent)?.label}の探し方`, description: "アーティストと公演を選び、当落・座席・レポ・セトリを確認する手順です。" });
    }
  }
  return [...result.values()].slice(0, limit);
}
