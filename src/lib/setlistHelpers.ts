export type EditableItem =
  | { id: string; type: "song"; title: string }
  | { id: string; type: "mc" }
  | { id: string; type: "encore" }
  | { id: string; type: "separator"; label: string }
  | { id: string; type: "tag"; label: string };

export type SetlistReviewSource = {
  kind: "verified_performance" | "official_recording";
  url: string | null;
};

export function readSetlistReviewSource(value: unknown): SetlistReviewSource | null {
  if (!value || typeof value !== "object" || !("kind" in value) || !("url" in value)) return null;
  if (value.kind !== "verified_performance" && value.kind !== "official_recording") return null;
  if (typeof value.url !== "string" || !value.url.startsWith("https://")) return null;
  const archiveSource = /^https:\/\/(?:[^./]+\.)*rockinon\.com(?:[/:?#]|$)/i.test(value.url);
  const hideLink = archiveSource || ("showLink" in value && value.showLink === false);
  return { kind: value.kind, url: hideLink ? null : value.url };
}

/** Empty drafts and structural markers alone are not a published song list. */
export function hasSetlistSongs(items: unknown): boolean {
  return Array.isArray(items) && items.some(item =>
    item !== null && typeof item === "object" && item.type === "song"
      && typeof item.title === "string" && item.title.trim().length > 0,
  );
}

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
