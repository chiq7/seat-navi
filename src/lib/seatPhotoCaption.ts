// Match a date only when it is present in the photographer’s performance credit.
const creditDate = /(?:\d{4}年\d{1,2}月\d{1,2}日|\d{4}[-/]\d{1,2}[-/]\d{1,2})/u;

export function seatPhotoCredit(event?: string) {
  const text = event?.trim() ?? "";
  const date = text.match(creditDate)?.[0];
  const name = date ? text.replace(date, "").replace(/^[・\s]+|[・\s]+$/gu, "") : text;
  const day = date?.match(/\d+/g);
  return { day: day ? day[1] + "/" + day[2] : "", name };
}

export const SEAT_VERIFIED_LABEL = "座席番号を照合済み";

/**
 * What is known about a photo, and nothing else: the stored performance credit and a verified seat.
 * Unknown dates, unverified positions and "reference photo" notes are left out (empty string when nothing is known).
 */
export function seatPhotoCaption(event: string | undefined, verified: boolean | undefined) {
  return [event?.trim(), verified ? SEAT_VERIFIED_LABEL : ""].filter(Boolean).join(" ｜ ");
}

export function photoSelectionCaption(match: { post: { event?: string; seatVerified?: boolean } }) {
  return seatPhotoCaption(match.post.event, match.post.seatVerified);
}
