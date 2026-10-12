export type SearchLandmark = {
  id: string;
  kind: "gate" | "passage";
  label: string;
  name?: string;
  aliases?: readonly string[];
  identifiers?: readonly string[];
};

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, "").trim();
const identifier = (value: string) => normalize(value).replace(/^(?:gate|g(?=\d)|入場ゲート|ゲート|通路)/, "").replace(/(?:gate|入場ゲート|ゲート|通路)$/, "");

/** Only an explicit range separator expands a range. Enumeration never fills gaps. */
function containsIdentifier(label: string, query: string) {
  const text = identifier(label);
  if (text === query) return true;
  if (!/^\d+$/.test(query)) return false;
  return text.split(/[・、,\/]/).some(part => {
    if (/^\d+$/.test(part)) return Number(part) === Number(query);
    const range = part.match(/^(\d+)[〜～~–—-](\d+)$/);
    return range ? Number(query) >= Number(range[1]) && Number(query) <= Number(range[2]) : false;
  });
}

export function searchVenueLandmarks(landmarks: readonly SearchLandmark[], kind: SearchLandmark["kind"], input: string) {
  const query = normalize(input), key = identifier(input);
  if (!query || !key || /^0+$/.test(key)) return [];
  return landmarks.filter(mark => mark.kind === kind && (
    [mark.label, mark.name, ...(mark.aliases ?? [])].some(name => name && normalize(name) === query)
    || (mark.identifiers ? mark.identifiers.some(value => identifier(value) === key) : containsIdentifier(mark.label, key))
  ));
}
