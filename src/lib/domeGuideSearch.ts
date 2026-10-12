/** Search vocabulary describes the visitor's intent, not confirmed product stock. */
export const normalizeDomeGuideQuery = (value: string) => value.normalize("NFKC").toLocaleLowerCase("ja").trim();

const aliases: readonly (readonly string[])[] = [
  ["飲み物", "のみもの", "ドリンク"],
  ["トイレ", "お手洗い", "おてあらい", "wc"],
  ["アイス", "アイスクリーム"],
  ["ロッカー", "コインロッカー"],
  ["バリアフリー", "多目的トイレ"],
];

export function matchesDomeGuideWord(text: string, word: string) {
  const alternatives = aliases.find((group) => group.includes(word)) ?? [word];
  return alternatives.some((term) => text.includes(term));
}

export function relatedDomeGuideQuery(query: string): string | null {
  return ["水", "みず", "ミネラルウォーター"].includes(normalizeDomeGuideQuery(query)) ? "飲み物" : null;
}
