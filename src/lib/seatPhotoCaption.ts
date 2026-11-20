import type { seatViewMatch } from "./seatViewPosts";

export type SeatMatchLabel = NonNullable<ReturnType<typeof seatViewMatch>>;

const matchText: Record<SeatMatchLabel, string> = {
  同じ座席: "同じ座席からの写真",
  同じ列の参考: "同じ列の参考写真",
  同じブロックの参考: "同じブロックの参考写真",
  同じ区画の参考: "同じ区画の参考写真",
  同じ入口付近の参考: "同じ入口付近の参考写真",
  同じ階の参考: "同じ階の参考写真",
  同じエリアの参考: "同じエリアの参考写真",
};

// Match a date only when it is present in the photographer’s performance credit.
const creditDate = /(?:\d{4}年\d{1,2}月\d{1,2}日|\d{4}[-/]\d{1,2}[-/]\d{1,2})/u;

export function seatPhotoCredit(event?: string) {
  const text = event?.trim() ?? "";
  const date = text.match(creditDate)?.[0];
  const name = date ? text.replace(date, "").replace(/^[・\s]+|[・\s]+$/gu, "") : text;
  const day = date?.match(/\d+/g);
  return { day: day ? day[1] + "/" + day[2] : "", name };
}

export function seatPhotoPosition(verified?: boolean) {
  return verified ? "座席番号を照合済み" : "撮影位置は投稿者申告（参考）";
}

/** Only the stored performance credit is a source for the shooting date. */
export function seatPhotoCaption(event: string | undefined, verified: boolean | undefined, relation?: string) {
  const credit = event?.trim();
  const date = credit?.match(creditDate)?.[0];
  let performance = credit || "撮影公演・日付は不明";
  if (credit && !date && !credit.includes("日付不明")) performance += "（撮影日不明）";
  if (date === credit && date) performance += "（公演名不明）";
  return [performance, relation, seatPhotoPosition(verified)].filter(Boolean).join(" ｜ ");
}

export function photoSelectionRelation(match: { label: SeatMatchLabel; context?: string }) {
  return match.context ?? matchText[match.label];
}

export function photoSelectionCaption(match: { post: { event?: string; seatVerified?: boolean }; label: SeatMatchLabel; context?: string }) {
  return seatPhotoCaption(match.post.event, match.post.seatVerified, photoSelectionRelation(match));
}
