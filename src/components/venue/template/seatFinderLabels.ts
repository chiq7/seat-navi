// Keep venue IDs intact for lookup and use the same labels in controls and search feedback.
const directionNames: Readonly<Record<string, string>> = {
  "バックネット側": "バックネット裏",
  "ネット裏": "バックネット裏",
  "レフト": "外野レフト", "レフト側": "外野レフト",
  "ライト": "外野ライト", "ライト側": "外野ライト",
  "外野レフト側": "外野レフト", "外野ライト側": "外野ライト",
  "1塁内野": "1塁側内野", "3塁内野": "3塁側内野",
  "1塁外野": "1塁側外野", "3塁外野": "3塁側外野",
};

export function directionName(label: string) {
  if (/^[東西南北]{1,2}$/.test(label)) return label + "側";
  if (/^[A-Z]$/.test(label)) return label + "ブロック";
  return directionNames[label] ?? label;
}

const internalSeatLevelNames: Readonly<Record<string, string>> = {
  stand: "スタンド", fixed: "固定席", outfield: "外野", infield: "内野", upper: "上段", lower: "下段",
};

export function seatLevelName(id: string, label?: string) {
  return internalSeatLevelNames[label ?? id] ?? label ?? internalSeatLevelNames[id] ?? "座席";
}

// Suggestions are ranked by verified numbers in the same printed row.
// A nearby number is never an identification of the visitor's seat.
export function nearSeatNumbers<T>(number: string, sections: readonly T[],
  intervals: (section: T) => readonly (readonly [number, number])[],
  label: (section: T) => string): T[] {
  const input = number.normalize("NFKC").trim().replace(/番$/, "");
  if (!/^\d+$/.test(input)) return [];
  const value = Number(input);
  const ranked = sections.map(section => ({
    section, distance: intervals(section).reduce((min, [start, end]) =>
      Math.min(min, Math.max(start - value, value - end, 0)), Infinity),
  })).filter(item => Number.isFinite(item.distance) && item.distance > 0)
    .sort((a, b) => a.distance - b.distance);
  const seen = new Set<string>();
  return ranked.filter(({ section }) => {
    const name = label(section);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  }).slice(0, 3).map(item => item.section);
}

export type SeatFinderQuery = { scope: string; row?: string; number?: string; block?: string };

export function seatQueryDescription(query: SeatFinderQuery) {
  if (query.block?.trim()) return query.block.trim();
  const row = query.row?.trim();
  const number = query.number?.trim();
  return [row && (/列$|段$/.test(row) ? row : row + "列"), number && (number.endsWith("番") ? number : number + "番")].filter(Boolean).join("");
}
