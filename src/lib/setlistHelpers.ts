export type EditableItem =
  | { id: string; type: "song"; title: string }
  | { id: string; type: "mc" }
  | { id: string; type: "encore" }
  | { id: string; type: "separator"; label: string };

export function fmtDateShort(d: string | null): string {
  if (!d) return "未定";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}

export function computeSongNumbers(items: EditableItem[]): Map<string, string> {
  const map = new Map<string, string>();
  let count = 0;
  let encCount = 0;
  let inEncore = false;
  for (const item of items) {
    if (item.type === "encore") {
      inEncore = true;
      encCount = 0;
    } else if (item.type === "song") {
      if (inEncore) {
        encCount++;
        map.set(item.id, `EN${encCount}`);
      } else {
        count++;
        map.set(item.id, String(count));
      }
    }
  }
  return map;
}
