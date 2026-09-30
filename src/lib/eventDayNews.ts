import { createHash } from "node:crypto";
import { getPerformanceSessionMarker } from "./eventIdentity";

/** Internal editorial input. Never pass article_body or evidence to a public component. */
export type EventDayNewsArticle = {
  id: string; artist_slug: string; article_title: string; article_url: string;
  article_body: string | null; published_date?: string | null; fetched_at?: string | null;
  category: string | null; event_name: string | null; tour_name: string | null;
  event_dates: string[] | null; venue_names: string[] | null;
  confidence: string | null; needs_review: boolean;
};
export type EventDayNewsEvent = {
  id: string; artist_slug: string | null; title: string; venue: string;
  venue_id: string; date: string | null;
};
export type EventDayNewsStatus = "candidate" | "needs-review" | "verified" | "published";
export type EventDayNewsField = "hours" | "place" | "deadline" | "conditions" | "preparation" | "open" | "start";
export type EventDayNewsEvidence = {
  id: string; field: EventDayNewsField; quote: string; sourceNewsId: string; sourceUrl: string;
  sourceStart: number; sourceEnd: number; dateScope: string[];
  context?: { quote: string; sourceStart: number; sourceEnd: number };
  scope: "explicit" | "context" | "article"; status: "candidate";
};
export type EventDayNewsCandidate = {
  id: string; newsId: string; articleUrl: string; articleTitle: string; artistSlug: string;
  eventId: string | null; possibleEventIds: string[]; status: EventDayNewsStatus;
  reasons: string[]; evidence: EventDayNewsEvidence[]; missingFields: EventDayNewsField[];
  fingerprint: string; correction: boolean; fetchedAt: string | null;
  review?: EventDayNewsReview;
};
export type EventDayNewsReview = {
  eventId: string; reviewer: string; checkedAt: string; sourceFingerprint: string;
  confirmedEvidenceIds: string[]; resolvedReasons: string[];
  /** Acknowledgement preserves missing values; it does not invent information. */
  acknowledgedMissingFields: EventDayNewsField[]; status: "verified" | "published";
};

const REQUIRED_FIELDS: EventDayNewsField[] = ["hours", "place", "conditions", "preparation"];
const RELEVANT = /グッズ|物販|先行販売|CD.{0,8}(?:販売|予約)|ブース|抽選会|特典引換|ファンクラブ|FC会員|MILE|チェックイン/i;
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s　・･「」『』<>〈〉《》_-]/g, "");
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}

/** Source changes invalidate prior human review, including changes to extracted metadata. */
export function eventDayNewsFingerprint(article: EventDayNewsArticle): string {
  return createHash("sha256").update(JSON.stringify([
    article.id, article.artist_slug, article.article_url, article.article_title, article.article_body,
    article.event_name, article.tour_name, article.event_dates, article.venue_names,
    article.category, article.confidence, article.needs_review,
  ])).digest("hex");
}

function datesInQuote(quote: string, knownDates: string[]): string[] {
  const result: string[] = [];
  const normalized = quote.normalize("NFKC");
  for (const match of normalized.matchAll(/(?:(20\d{2})[年/.-])?(\d{1,2})[月/.-](\d{1,2})(?:日|\b)/g)) {
    const [, year, month, day] = match;
    // A bare month/day is resolved only against the article's explicit, year-bearing dates.
    const matches = knownDates.filter(date => (!year || date.startsWith(year)) &&
      Number(date.slice(5, 7)) === Number(month) && Number(date.slice(8, 10)) === Number(day));
    if (matches.length === 1) result.push(matches[0]);
  }
  return unique(result);
}

/** Retain exact source offsets. This parser extracts review snippets, never confirmed values. */
export function extractEventDayNewsEvidence(article: EventDayNewsArticle): EventDayNewsEvidence[] {
  const body = article.article_body ?? "";
  if (!body.trim()) return [];
  const dates = unique((article.event_dates ?? []).filter(validDate));
  const boundaries = [0, ...[...body.matchAll(/[\r\n\u2028\u2029]+|(?=【|■|●|※)|(?=(?:20\d{2}年)?\d{1,2}月\d{1,2}日)/g)].map(m => m.index!), body.length];
  const starts = [...new Set(boundaries)].sort((a, b) => a - b);
  const evidence: EventDayNewsEvidence[] = [];
  let contextDates: string[] = [];
  let contextLabel = "";
  let contextSource: EventDayNewsEvidence["context"];
  for (let i = 0; i < starts.length - 1; i++) {
    const raw = body.slice(starts[i], starts[i + 1]);
    const leading = raw.length - raw.trimStart().length;
    const quote = raw.trim().slice(0, 1200);
    if (!quote) continue;
    const explicitDates = datesInQuote(quote, dates);
    if (explicitDates.length) contextDates = explicitDates;
    if (/全(?:会場|日程)|日程共通/.test(quote)) contextDates = [];
    if (/^(?:【|■|●)/.test(quote)) {
      contextLabel = quote.slice(0, 80);
      contextSource = { quote: contextLabel, sourceStart: starts[i] + leading, sourceEnd: starts[i] + leading + contextLabel.length };
    }
    const text = `${contextLabel}\n${quote}`.normalize("NFKC");
    const fields: EventDayNewsField[] = [];
    if (/(?:販売|営業|受付|受取|ブース)(?:開始)?(?:時間|日時)|先行販売/.test(text) && /\d{1,2}:\d{2}|開場|開演|終演|未定|未発表/.test(quote)) fields.push("hours");
    if (/販売場所|受取場所|受付場所|場所\s*[:：]|(?:[12一二]階|[12]F).{0,40}(?:ブース|乗降所|プラザ|広場|B-SITE|BSQUARE)/i.test(quote)) fields.push("place");
    if (/締切|締め切り|引換.{0,40}まで|抽選.{0,40}まで|受付期間|受付.{0,40}まで/.test(quote)) fields.push("deadline");
    if (/対象|会員限定|チケットをお持ち|参加条件|購入者|予約者/.test(quote)) fields.push("conditions");
    if (/提示|持参|準備|必要なもの|位置情報|スクリーンショット|スクショ/.test(quote)) fields.push("preparation");
    if (/(?:開場|OPEN)\s*[:：]?\s*\d{1,2}:\d{2}/i.test(quote)) fields.push("open");
    if (/(?:開演|START)\s*[:：]?\s*\d{1,2}:\d{2}/i.test(quote)) fields.push("start");
    const sourceStart = starts[i] + leading;
    // Very long unstructured paragraphs stay explicitly incomplete; no fabricated field values.
    const sourceEnd = sourceStart + Math.min(quote.length, 1200);
    for (const field of fields) evidence.push({
      id: `${article.id}:${field}:${sourceStart}`, field, quote: body.slice(sourceStart, sourceEnd),
      sourceNewsId: article.id, sourceUrl: article.article_url, sourceStart, sourceEnd,
      context: contextSource ? { ...contextSource } : undefined,
      dateScope: explicitDates.length ? explicitDates : [...contextDates],
      scope: explicitDates.length ? "explicit" : contextDates.length ? "context" : "article", status: "candidate",
    });
  }
  return evidence;
}

/** Match only existing events. Never create events, infer date/venue pairings, or publish candidates. */
export function planEventDayNews(news: readonly EventDayNewsArticle[], events: readonly EventDayNewsEvent[]): EventDayNewsCandidate[] {
  const result: EventDayNewsCandidate[] = [];
  for (const article of news) {
    if (!RELEVANT.test(`${article.article_title}\n${article.article_body ?? ""}`)) continue;
    const dates = unique((article.event_dates ?? []).filter(validDate));
    const venues = unique(article.venue_names ?? []);
    const articleSession = getPerformanceSessionMarker(`${article.event_name ?? ""} ${article.tour_name ?? ""} ${article.article_title}`);
    const sameSlot = events.filter(event => event.artist_slug === article.artist_slug &&
      event.date && dates.includes(event.date) && venues.some(venue => normalize(venue) === normalize(event.venue)));
    const matches = sameSlot.filter(event => {
      const eventSession = getPerformanceSessionMarker(event.title);
      return (!articleSession && !eventSession) || articleSession === eventSession;
    });
    const evidence = extractEventDayNewsEvidence(article);
    const correction = /訂正|変更|更新|中止|延期|修正/.test(article.article_title);
    const baseReasons: string[] = [];
    if (!article.article_body?.trim()) baseReasons.push("本文未取得（画像・別リンクの内容を取得済み扱いにしない）");
    if (!dates.length || (article.event_dates ?? []).some(date => !validDate(date))) baseReasons.push("年付きの公演日が未確定");
    if (!venues.length) baseReasons.push("会場未確定");
    if (article.needs_review || article.confidence !== "high") baseReasons.push("NEWS分類メタデータの確認が必要");
    if (dates.length > 1) baseReasons.push("複数日程の時刻・対象条件の差を確認する");
    if (venues.length > 1) baseReasons.push("複数会場と各公演日の対応を確認する");
    if (correction) baseReasons.push("訂正・変更記事のため既存確認結果との突合が必要");
    if (/画像|マップ|配置図|会場図/.test(article.article_body ?? "")) baseReasons.push("画像内の場所は本文だけで確定できない");
    const ambiguousSameSlot = matches.some(event => matches.filter(other => other.date === event.date && normalize(other.venue) === normalize(event.venue)).length > 1);
    const targets: Array<EventDayNewsEvent | null> = matches.length && !ambiguousSameSlot ? matches : [null];
    for (const event of targets) {
      const reasons = [...baseReasons];
      const slotMatches = event ? sameSlot.filter(other => other.date === event.date && normalize(other.venue) === normalize(event.venue)) : sameSlot;
      if (!event) reasons.push(ambiguousSameSlot ? "同日同会場の複数公演から一意に決められない" : sameSlot.length ? "回次の一致が確認できない" : "一致する既存公演がない");
      if (event && slotMatches.length > 1 && !articleSession) reasons.push("同日同会場に複数公演があり回次未確定");
      const relevantEvidence = evidence.filter(item => !event || !item.dateScope.length || item.dateScope.includes(event.date!));
      const missingFields = REQUIRED_FIELDS.filter(field => !relevantEvidence.some(item => item.field === field));
      result.push({
        id: `${article.id}:${event?.id ?? "unmatched"}`, newsId: article.id,
        articleUrl: article.article_url, articleTitle: article.article_title, artistSlug: article.artist_slug,
        eventId: event?.id ?? null, possibleEventIds: sameSlot.map(item => item.id),
        status: reasons.length ? "needs-review" : "candidate", reasons, evidence: relevantEvidence,
        missingFields, fingerprint: eventDayNewsFingerprint(article), correction, fetchedAt: article.fetched_at ?? null,
      });
    }
  }
  return result;
}

/** A human can confirm only the same source edition; this never updates NEWS or a public registry. */
export function applyEventDayNewsReview(candidate: EventDayNewsCandidate, review: EventDayNewsReview): EventDayNewsCandidate {
  if (review.sourceFingerprint !== candidate.fingerprint) throw new Error("Source changed; review again.");
  if (!review.reviewer.trim() || !validDate(review.checkedAt.slice(0, 10)) || !Number.isFinite(Date.parse(review.checkedAt))) throw new Error("Reviewer and confirmation date are required.");
  if (!["verified", "published"].includes(review.status)) throw new Error("An explicit verified/published review status is required.");
  if (!candidate.possibleEventIds.includes(review.eventId)) throw new Error("Review must select an existing matched event.");
  if (candidate.eventId && candidate.eventId !== review.eventId) throw new Error("Review cannot change an already resolved event identity.");
  if (candidate.reasons.some(reason => !review.resolvedReasons.includes(reason))) throw new Error("Unresolved article/date/venue/session issues remain.");
  if (candidate.missingFields.some(field => !review.acknowledgedMissingFields.includes(field))) throw new Error("Missing fields must remain explicitly acknowledged.");
  if (!review.confirmedEvidenceIds.length || review.confirmedEvidenceIds.some(id => !candidate.evidence.some(item => item.id === id))) throw new Error("Source-backed confirmed evidence is required.");
  return { ...candidate, eventId: review.eventId, status: review.status, review: structuredClone(review) };
}
