import { normalizeForSearch } from "@/lib/keywordMatch";
import { parseSearchQuery, type SearchQuery } from "@/lib/searchQuery";
import { SEARCH_SPELLING_ENTITIES, type SearchSpellingEntity } from "@/lib/searchSpellingCatalog";

export type SearchNameSuggestion = { title: string; href: string; correction: boolean };
type Span = { start: number; end: number; text: string };
type Match = { entity: SearchSpellingEntity; distance: number; matchedName: string; matchedNames: string[] };
const aliasesByLength = new Map<number, { name: string; entity: SearchSpellingEntity }[]>();
for (const entity of SEARCH_SPELLING_ENTITIES) for (const name of entity.names) {
  if (name.length < 3 || name.length > 64) continue;
  const entries = aliasesByLength.get(name.length) ?? [];
  entries.push({ name, entity }); aliasesByLength.set(name.length, entries);
}
const site = SEARCH_SPELLING_ENTITIES.find(entity => entity.kind === "site")!;
const neutral = new Set(["LIVE", "ライブ", "コンサート", "公演", "会場", "公式", "公式情報", "www", "com"].map(normalizeForSearch));

/** Restricted Damerau-Levenshtein: insert/delete/substitute and adjacent transposition. */
function distanceWithin(a: string, b: string, maximum: number): number {
  if (Math.abs(a.length - b.length) > maximum) return maximum + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i), beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        row[j] = Math.min(row[j], beforePrevious[j - 2] + 1);
    }
    if (Math.min(...row) > maximum) return maximum + 1;
    beforePrevious = previous; previous = row;
  }
  return previous[b.length];
}

/** The same candidate policy applies to every registered identity, including ambiguous inputs. */
export function getSearchSpellingCandidates(value: string): Match[] {
  const text = normalizeForSearch(value);
  if (text.length < 3 || text.length > 64 || neutral.has(text) || /^\d+$/.test(text)) return [];
  const matches = new Map<SearchSpellingEntity, { distance: number; matchedName: string; matchedNames: string[] }>();
  for (let length = Math.max(3, text.length - 2); length <= text.length + 2; length++) {
    for (const { name, entity } of aliasesByLength.get(length) ?? []) {
      const maximum = Math.min(name.length, text.length) >= 8 ? 2 : 1;
      if (Math.abs(name.length - text.length) > maximum) continue;
      const distance = distanceWithin(text, name, maximum);
      if (distance > maximum) continue;
      const previous = matches.get(entity);
      if (distance < (previous?.distance ?? Infinity)) matches.set(entity, { distance, matchedName: name, matchedNames: [name] });
      else if (distance === previous?.distance) previous.matchedNames.push(name);
    }
  }
  const ordered = [...matches].map(([entity, match]) => ({ entity, ...match })).sort((a, b) => a.distance - b.distance || a.entity.title.localeCompare(b.entity.title, "ja"));
  const minimum = ordered[0]?.distance;
  return ordered.filter(match => match.distance === minimum);
}

function isResolved(entity: SearchSpellingEntity, parsed: SearchQuery) {
  return entity.kind === "artist" ? parsed.artistSlugs.includes(entity.id)
    : entity.kind === "venue" ? parsed.venueIds.includes(entity.id)
    : entity.kind === "region" ? parsed.regionIds.includes(entity.id)
    : entity.kind === "intent" ? parsed.intentIds.some(id => id === entity.id) : false;
}

export function getSearchNameSuggestions(query: string, parsed = parseSearchQuery(query)): SearchNameSuggestion[] {
  const written = query.normalize("NFKC").trim();
  if (!written || written.length > 120) return [];
  const maybeSite = normalizeForSearch(written.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")).replace(/(?:の)?(?:ほーむぺーじ|さいと|とっぷ|ほーむ|公式)$/, "");
  if (site.names.includes(maybeSite)) return [{ title: site.title, href: "/", correction: false }];
  if (SEARCH_SPELLING_ENTITIES.some(entity => entity.names.includes(normalizeForSearch(written)))) return [];
  if (!parsed.remainder.length) return [];

  let compact = "";
  const offsets: { start: number; end: number }[] = [];
  for (let i = 0; i < written.length;) {
    const char = String.fromCodePoint(written.codePointAt(i)!);
    const normalized = normalizeForSearch(char);
    compact += normalized;
    for (let j = 0; j < normalized.length; j++) offsets.push({ start: i, end: i + char.length });
    i += char.length;
  }
  const protectedChars = Array<boolean>(compact.length).fill(false);
  const protectedRanges: { start: number; end: number; text: string; entity?: SearchSpellingEntity }[] = [];
  function protect(term: string, entity?: SearchSpellingEntity) {
    for (let from = 0;;) {
      const start = compact.indexOf(term, from); if (start < 0) break;
      protectedRanges.push({ start, end: start + term.length, text: term, entity });
      protectedChars.fill(true, start, start + term.length); from = start + term.length;
    }
  }
  for (const entity of SEARCH_SPELLING_ENTITIES.filter(entity => isResolved(entity, parsed)))
    for (const name of entity.names) protect(name, entity);
  for (const date of parsed.dates) protect(normalizeForSearch(date));

  const spans = new Map<string, Span>();
  function add(start: number, end: number) {
    if (end - start < 3 || end - start > 64) return;
    const text = compact.slice(start, end);
    if (neutral.has(text)) return;
    spans.set(start + ":" + end, { start, end, text });
  }
  // Keep complete multiword names, while allowing separate misspellings in one query.
  const words = [...written.matchAll(/\S+/g)];
  for (let i = 0; i < words.length; i++) for (let n = 1; n <= 5 && i + n <= words.length; n++) {
    const rawStart = words[i].index!, rawEnd = words[i + n - 1].index! + words[i + n - 1][0].length;
    const start = offsets.findIndex(offset => offset.start >= rawStart);
    const last = offsets.findLastIndex(offset => offset.end <= rawEnd);
    if (start >= 0 && last >= start) add(start, last + 1);
  }
  for (let start = 0; start < compact.length;) {
    if (protectedChars[start]) { start++; continue; }
    let end = start + 1;
    while (end < compact.length && !protectedChars[end]) end++;
    add(start, end); start = end;
  }
  for (const text of parsed.remainder) {
    const start = compact.indexOf(text);
    if (start >= 0 && start === compact.lastIndexOf(text)) add(start, start + text.length);
  }
  const groups = [...spans.values()].flatMap(span => {
    const matches = getSearchSpellingCandidates(span.text).filter(match => match.distance > 0 && protectedRanges.every(range => {
      if (span.start >= range.end || span.end <= range.start) return true;
      if (!range.entity) return false; // Never alter a date to manufacture a name match.
      const retained = match.matchedNames.some(name => name.includes(range.text));
      if (range.entity.kind === "artist" || range.entity.kind === "venue")
        return range.entity.kind === match.entity.kind && (range.entity.id === match.entity.id || retained);
      return retained; // Keep recognized purposes and regions unless they are part of the corrected name.
    }));
    return matches.length ? [{ span, matches }] : [];
  }).sort((a, b) => b.span.text.length - a.span.text.length || a.matches[0].distance - b.matches[0].distance || a.span.start - b.span.start);
  const chosen: typeof groups = [];
  for (const group of groups) {
    if (chosen.some(other => group.span.start < other.span.end && group.span.end > other.span.start)) continue;
    chosen.push(group); if (chosen.length === 3) break;
  }
  chosen.sort((a, b) => a.span.start - b.span.start);
  type Replacement = { span: Span; match: Match };
  let variants: Replacement[][] = [[]];
  for (const group of chosen) variants = variants.flatMap(variant => group.matches.slice(0, 5).map(match => [...variant, { span: group.span, match }])).slice(0, 5);
  const suggestions = new Map<string, SearchNameSuggestion>();
  for (const replacements of variants) {
    if (!replacements.length) continue;
    let corrected = written;
    for (const { span, match } of [...replacements].reverse()) {
      const start = offsets[span.start].start, end = offsets[span.end - 1].end;
      corrected = corrected.slice(0, start) + match.entity.title + corrected.slice(end);
    }
    const one = replacements.length === 1 ? replacements[0] : null;
    const onlyName = one?.span.start === 0 && one?.span.end === compact.length;
    const href = onlyName && one?.match.entity.href ? one.match.entity.href : "/search?q=" + encodeURIComponent(corrected);
    suggestions.set(href, { title: onlyName || replacements.length === 1 ? replacements[0].match.entity.title : corrected, href, correction: true });
  }
  return [...suggestions.values()];
}
