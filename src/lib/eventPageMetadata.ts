import { MIN_PHOTO_COUNT_FOR_TITLE, seatPhotoTitle } from "./metadata";
import { hasConfirmedPerformanceDate } from "./eventPublication";
import { getEventDisplayVenueName } from "./publicVenueGuides";
import type { CrawledEvent } from "./types";

// Confirmed performers for shows outside the artist directory. Exact tour titles
// avoid attributing a tribute show or multi-artist event to a name in its title.
const verifiedTourArtists = new Map([
  // https://www.bumpofchicken.com/live_information/2799
  ["BUMP OF CHICKEN TOUR 2026-2027 Ratio Clavis", "BUMP OF CHICKEN"],
  // https://member.vaundy.jp/feature/dome_tour_2026
  ["Vaundy DOME TOUR 2026", "Vaundy"],
  // https://k-arena.com/schedule/20260613-1/
  ["JANET JACKSON JAPAN 2026", "JANET JACKSON"],
  // https://toki-sen.com/contents/1120608
  ["超ときめき♡宣伝部のきみのハートにロックオンTOUR 2026", "超ときめき♡宣伝部"],
  // https://sakanaction.jp/feature/tour2026-2027
  ["サカナクション", "サカナクション"],
]);

export function getEventPerformerName(title: string, artistName?: string): string | undefined {
  return artistName?.trim() || verifiedTourArtists.get(title.trim());
}

function sessionLabel(title: string): string {
  const text = title.normalize("NFKC");
  const part = text.match(/昼公演|夜公演|昼の部|夜の部|matinee|evening|(?:第\s*)?\d{1,2}\s*部|(?:show|公演)\s*#?\s*\d{1,2}\b/iu)?.[0];
  const start = text.match(/(?:開演|start)\s*:?\s*((?:[01]?\d|2[0-3]):[0-5]\d)/iu)?.[1]
    ?? text.match(/((?:[01]?\d|2[0-3]):[0-5]\d)\s*(?:開演|start)/iu)?.[1];
  const time = start ? '開演' + start : text.match(/\(\s*((?:[01]?\d|2[0-3]):[0-5]\d)\s*\)/u)?.[1];
  return [part, time].filter(Boolean).join("・");
}

export function getEventPageText(event: CrawledEvent, artistName: string | undefined, photoCount: number) {
  const name = event.title.trim();
  const venueName = getEventDisplayVenueName(event.venue_id, event.venue);
  const performer = getEventPerformerName(name, artistName);
  const artist = performer ?? name;
  const session = performer ? sessionLabel(name) : "";
  const dateParts = event.date && hasConfirmedPerformanceDate(event) ? event.date.split("-").map(Number) : null;
  const [year, month, day] = dateParts ?? [];
  const date = dateParts ? `（${year}年${month}月${day}日${session ? "・" + session : ""}）` : session ? ` ${session}` : "";
  const manyPhotos = photoCount >= MIN_PHOTO_COUNT_FOR_TITLE;
  const subject = artist + " " + venueName + "の" + (manyPhotos ? "座席・見え方" : "座席表・見え方・感想");
  const fullTitle = seatPhotoTitle(subject + date, photoCount);
  const compactDate = dateParts && Array.from(fullTitle).length > 65
    ? "（" + [year, month, day].join("/") + (session ? "・" + session : "") + "）" : null;
  const title = compactDate ? seatPhotoTitle(subject + compactDate, photoCount) : fullTitle;
  const lead = `${artist}の${venueName}公演${date}`;
  return {
    name, title,
    description: manyPhotos
      ? `${lead}の座席表・各席からの見え方写真を${photoCount}枚掲載！アリーナ・スタンドの距離感や参加者の座席レビューをチェックできます。`
      : `${lead}の座席表や見え方情報、参加者の感想まとめ。ライブ前後の座席チェック・見え方投稿にも活用できます。`,
  };
}
