// Match a date only when it is present in the photographer’s performance credit.
const creditDate = /(?:\d{4}年\d{1,2}月\d{1,2}日|\d{4}[-/]\d{1,2}[-/]\d{1,2})/u;

export function seatPhotoCredit(event?: string) {
  const text = event?.trim() ?? "";
  const date = text.match(creditDate)?.[0];
  const name = date ? text.replace(date, "").replace(/^[・\s]+|[・\s]+$/gu, "") : text;
  const day = date?.match(/\d+/g);
  return { day: day ? day[1] + "/" + day[2] : "", name };
}

/**
 * What a photo is captioned with: the stored performance credit, and nothing else.
 * Unknown dates, positions and "reference photo" or "verified" notes are left out (empty string when no show is stored).
 */
export function seatPhotoCaption(event: string | undefined) {
  return event?.trim() ?? "";
}

export function photoSelectionCaption(match: { post: { event?: string } }) {
  return seatPhotoCaption(match.post.event);
}
