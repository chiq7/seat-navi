export function fmtDate(d: string | null): string {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

export function fmtPct(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0 && n > 0) return n.toFixed(1);
  return String(rounded);
}

export function seatAreaLabel(type: string | null): string {
  const map: Record<string, string> = {
    arena: "アリーナ",
    stand_1f: "1階スタンド",
    stand_2f: "2階スタンド",
    stand_3f_or_higher: "3階以上",
    other_unknown: "その他",
  };
  return type ? (map[type] ?? type) : "不明";
}

export function rateText(rate: number | null): string {
  return rate === null ? "--" : fmtPct(rate);
}

export function detailRateText(rate: number | null): string {
  return rate === null ? "--" : `${fmtPct(rate)}%`;
}
