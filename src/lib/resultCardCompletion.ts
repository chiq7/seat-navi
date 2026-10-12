import { publicResultCard, type PublicResultCard } from "./resultCard";

export type CompletionEvent = { id: string; title: string; venue: string; date: string | null };
export type CompletionResultInput = {
  event: CompletionEvent;
  artistName?: string;
  result: "won" | "lost";
  lotteryLabel: string;
  area: string;
  block: string;
  standDirection: string;
  standFloor: string;
};

/** Free-form seat details, row, number, comments and profile never enter this payload. */
export function completionResultCard(input: CompletionResultInput): PublicResultCard {
  const normalized = input.block.normalize("NFKC").replace(/\s/g, "").toUpperCase();
  const block = /^[A-Z]{1,3}\d{0,2}$/.test(normalized) ? normalized : "";
  const stand = ["1塁側", "3塁側", "外野", "北", "南", "西", "東"].includes(input.standDirection) ? input.standDirection : "";
  return publicResultCard({
    artist: input.artistName || input.event.title,
    venue: input.event.venue,
    dateLabel: input.event.date?.slice(0, 10).replaceAll("-", ".") ?? "日付未定",
    lotteryLabel: input.lotteryLabel,
    result: input.result,
    // No history is inferred from lottery type, comments or the number of applications.
    seat: input.result === "won" ? { area: input.area, block: input.area === "アリーナ" ? block : input.area === "スタンド" ? stand : "", layout: "unverified" } : undefined,
  });
}

export function completionLinks(eventId: string) {
  const id = encodeURIComponent(eventId);
  return { event: `/events/${id}`, report: `/report/ticket?event=${id}`, share: `https://tixrepo.com/events/${id}` };
}

export function completionShareText(card: PublicResultCard): string {
  return `${card.artist}｜${card.venue} ${card.dateLabel}\n${card.result === "won" ? `当選！${card.seat ? ` ${card.seat.area} ${card.seat.block}` : ""}` : "落選"}\n#ちけレポ`;
}
