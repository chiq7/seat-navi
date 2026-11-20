import { toHiragana, toRomaji } from "wanakana";
import { normalizeForSearch } from "@/lib/keywordMatch";

const phoneticSpellings: Record<string, string> = {
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo",
  てぃ: "ti", でぃ: "di", とぅ: "tu", どぅ: "du",
};

const inputSpellings: Record<string, string> = {
  ...phoneticSpellings,
  し: "si", ち: "ti", つ: "tu", ふ: "hu", じ: "zi", ぢ: "di", づ: "du",
  しゃ: "sya", しゅ: "syu", しょ: "syo",
  ちゃ: "tya", ちゅ: "tyu", ちょ: "tyo",
  じゃ: "zya", じゅ: "zyu", じょ: "zyo",
};

export function getRomajiSearchNames(readings: readonly string[]): string[] {
  const names = new Set<string>();
  for (const reading of readings) {
    const kana = normalizeForSearch(reading);
    if (!/^[ぁ-ゖー\d]+$/.test(kana) || !/[ぁ-ゖ]/.test(kana)) continue;
    const expanded = toHiragana(reading.normalize("NFKC"));
    for (const spelling of [toRomaji(expanded, { customRomajiMapping: phoneticSpellings }), toRomaji(expanded, { customRomajiMapping: inputSpellings })]) {
      const name = normalizeForSearch(spelling);
      if (!/^[a-z\d]{4,}$/.test(name)) continue;
      names.add(name);
      const shortVowels = name.replace(/([aeiou])\1/g, "$1").replace(/ou/g, "o");
      if (shortVowels.length >= 4) names.add(shortVowels);
    }
  }
  return [...names];
}
