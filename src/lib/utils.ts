/** Format percentage – returns "0" when input is falsy */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0";
  return Math.round(value).toString();
}

/** Generate star rating string (★☆) from a 0-5 score */
export function starRating(score: number, max = 5): string {
  const filled = Math.round(Math.min(Math.max(score, 0), max));
  return "★".repeat(filled) + "☆".repeat(max - filled);
}

/** 集まり度スコア → 一言ラベル (評価に見せない) */
export function atsumariLabel(score: number): string {
  if (score >= 4.5) return "ほぼ確定級";
  if (score >= 3.5) return "かなり固い";
  if (score >= 2.5) return "そこそこ固い";
  if (score >= 1.5) return "傾向見え始め";
  return "情報少なめ";
}

/** Truncate string with ellipsis */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

/** Genre key → display label */
export function genreLabel(genre: string): string {
  const map: Record<string, string> = {
    kpop: "K-POP",
    johnnys: "ジャニーズ",
    female_idol: "女性アイドル",
    male_idol: "男性アイドル",
    other: "その他",
  };
  return map[genre] ?? genre;
}

/** 抽選種別 key → display label */
export function lotteryLabel(key: string): string {
  const map: Record<string, string> = {
    fc_first: "FC一次",
    fc_second: "FC二次",
    general: "一般",
    upgrade: "アップグレード",
    revival: "復活当選",
    production: "制作開放",
  };
  return map[key] ?? key;
}

/** CSS class helper – filter falsy values */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
