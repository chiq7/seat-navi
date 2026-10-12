/** Public image data only. Never spread a saved report into an image or share payload. */
export type ResultCardInput = {
  artist: string;
  venue: string;
  dateLabel: string;
  lotteryLabel?: string;
  result: "won" | "lost";
  lossStreak?: number;
  previousLosses?: number;
  seat?: { area: string; block: string; layout: "sample" | "unverified" };
  row?: string;
  seatNumber?: string;
  userId?: string;
};

export type PublicResultCard = Omit<ResultCardInput, "row" | "seatNumber" | "userId">;
export type PhraseKind = "lost" | "won" | "comeback" | "seat";
export type ResultPhrase = readonly [string, string];

// Small curated first batch; the agreed ~100 phrases are a later editorial step.
export const RESULT_PHRASES: Record<PhraseKind, readonly ResultPhrase[]> = {
  lost: [
    ["このアカウント、抽選の神に", "ミュートされています。"],
    ["当選メール、", "私のアドレスだけ知らない説。"],
    ["お祓いのできるフォロワー、", "至急集合。"],
    ["抽選の神と、", "ちょっと話をつけてきます。"],
    ["徳は積んだ。", "配送先を間違えたらしい。"],
    ["推しには会いたい。", "この画面にはもう会いたくない。"],
  ],
  won: [
    ["推しに会う予定が、", "正式に入りました。"],
    ["当選の二文字で、", "今日の情緒が帰ってこない。"],
    ["いったん落ち着こう。", "無理でした。"],
    ["生きる理由が、", "カレンダーに追加されました。"],
    ["当選画面、", "本日何度目かの生存確認。"],
    ["今日だけは、", "ちょっと騒がせてください。"],
  ],
  comeback: [
    ["抽選の神、", "ようやくミュートを解除。"],
    ["ここまでの落選、", "全部この伏線だったことにする。"],
    ["長かった。", "今日は盛大に祝ってほしい。"],
    ["当選の二文字、", "実在していました。"],
    ["お待たせしました。", "私にも当選回が来ました。"],
    ["落選画面の常連、", "本日めでたく卒業です。"],
  ],
  seat: [
    ["当日の私、", "このあたりに生息しています。"],
    ["推しを見つめる場所、", "こちらになりました。"],
    ["このあたりの皆さん、", "当日は情緒を支え合おう。"],
    ["当日の心の住所が、", "決まりました。"],
    ["ここから届けます。", "声と、ありったけの愛。"],
    ["近くの席の人、", "心の中で握手しよう。"],
  ],
};

function positiveCount(value: number | undefined): number | undefined {
  return value !== undefined && Number.isInteger(value) && value > 0 && value <= 999 ? value : undefined;
}

export function publicResultCard(input: ResultCardInput): PublicResultCard {
  // Explicit allowlist also strips unknown nested properties from a seat object.
  return {
    artist: input.artist,
    venue: input.venue,
    dateLabel: input.dateLabel,
    lotteryLabel: input.lotteryLabel,
    result: input.result,
    lossStreak: input.result === "lost" ? positiveCount(input.lossStreak) : undefined,
    previousLosses: input.result === "won" ? positiveCount(input.previousLosses) : undefined,
    seat: input.result === "won" && input.seat ? {
      area: input.seat.area, block: input.seat.block, layout: input.seat.layout,
    } : undefined,
  };
}

export function resultPhraseKind(card: PublicResultCard, showSeat: boolean): PhraseKind {
  if (card.result === "lost") return "lost";
  if (showSeat && card.seat) return "seat";
  return card.previousLosses ? "comeback" : "won";
}

/** Uniform selection excluding the current phrase; only the copy changes. */
export function nextPhraseIndex(length: number, current: number, random = Math.random()): number {
  if (length <= 1) return 0;
  const pick = Math.min(length - 2, Math.max(0, Math.floor(random * (length - 1))));
  return pick >= current ? pick + 1 : pick;
}

export const RESULT_CARD_SAMPLES: Record<"lost" | "won" | "seat", PublicResultCard> = {
  lost: publicResultCard({ artist: "Stray Kids", venue: "京セラドーム大阪", dateLabel: "2026.09.20", lotteryLabel: "FC先行（例）", result: "lost", lossStreak: 4 }),
  won: publicResultCard({ artist: "Stray Kids", venue: "京セラドーム大阪", dateLabel: "2026.09.20", lotteryLabel: "FC先行（例）", result: "won", previousLosses: 4, seat: { area: "アリーナ", block: "A", layout: "sample" } }),
  seat: publicResultCard({ artist: "Stray Kids", venue: "京セラドーム大阪", dateLabel: "2026.09.20", result: "won", seat: { area: "アリーナ", block: "A", layout: "sample" } }),
};
