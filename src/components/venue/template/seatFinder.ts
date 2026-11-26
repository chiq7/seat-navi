import { normalizeSeatInput, searchStandSeats, standSelectedNumberRun, type StandBlock, type StandMapData, type StandPosition, type StandZone } from "./standMap";

// One seat search for the stand maps: the place printed on the ticket (block, door, entrance, level…), row and number.
// The page shows these as one line of boxes; any of them may be left empty.

export type SeatFinderLevel = { id: string; label: string };
export type SeatFinderScope = { level: string; area: string; zone: string | null };
export const WHOLE_VENUE: SeatFinderScope = { level: "all", area: "all", zone: null };

// What the first box is called at each venue, in the words of its own seat map, with an example the search finds
// (scripts/seatFinder.test.mts checks every example).
const PLACE_FIELDS: Readonly<Record<string, { label: string; hint: string }>> = {
  "ariake-fixed-stand": { label: "ブロック", hint: "B" },
  "belluna-seats": { label: "エリア", hint: "1塁内野" },
  "budokan-reference-stands": { label: "階・方角", hint: "1階南" },
  "edion-fixed-seats": { label: "ゾーン", hint: "B" },
  "edion-second-seats": { label: "会場", hint: "第2競技場" },
  "gaishi-fixed": { label: "ブロック", hint: "H" },
  "gaishi-bleacher": { label: "ブロック", hint: "H" },
  "hiroshima-stand": { label: "ブロック", hint: "G" },
  "k-arena-permanent-stands": { label: "LEVEL", hint: "5" },
  "koshien-seats": { label: "エリア", hint: "アイビー" },
  "makuhari-seats": { label: "ブロック", hint: "B" },
  "makuhari-exhibition-seats": { label: "ホール", hint: "3ホール" },
  "marine-concert": { label: "ブロック", hint: "A" },
  "marine-center": { label: "ブロック", hint: "A" },
  "miyagi-stand": { label: "ブロック", hint: "G" },
  "mufg-seats": { label: "ブロック", hint: "121" },
  "nissan-seats": { label: "入口", hint: "E13" },
  "osaka-stand-current": { label: "ブロック", hint: "H" },
  "paypay-stand-reference": { label: "エリア", hint: "1塁側前方" },
  "pia-arena-mm-seat-plans": { label: "階", hint: "2F" },
  "ssa-seat-arena": { label: "扉", hint: "207" },
  "ssa-seat-stadium": { label: "扉", hint: "207" },
  "sapporo-baseball": { label: "通路", hint: "86" },
  "sapporo-soccer": { label: "通路", hint: "86" },
  "toki-seats-exhibition": { label: "ホール", hint: "展示ホールA" },
  "toki-seats-main": { label: "ホール", hint: "スノーホール" },
  "tokyo-garden-theater-seat-plans": { label: "ブロック", hint: "1A" },
  "vantelin-seat-reference": { label: "エリア", hint: "1塁側" },
  "vantelin-prime-unfolded": { label: "席種", hint: "ツイン" },
  "ya-common-bowl-current": { label: "ブロック", hint: "A" },
  "yoyogi-stand-reference": { label: "ブロック", hint: "北1A" },
  "zozo-seats": { label: "エリア", hint: "上段1塁側" },
};

export function seatPlaceField(data: StandMapData): { label: string; hint: string } {
  return PLACE_FIELDS[data.diagramId]
    ?? { label: "ブロック", hint: data.zones?.[0]?.label ?? data.blocks[0].aliases.find(alias => alias.length <= 6) ?? data.blocks[0].label };
}

/** A long example does not fit beside the row and number boxes on a phone: the place box then takes its own line. */
export function seatHintIsWide(hint: string) {
  return [...hint].reduce((width, char) => width + (/[\x20-\x7e]/.test(char) ? .6 : 1), 0) > 3;
}

/**
 * The venue's row example, cut down to the row itself ("例：G14（区画＋列）" → "例：14").
 * `compact`: beside the place box there is room for one character ("例：5", "例：A").
 */
export function seatRowHint(data: StandMapData, compact = false) {
  const text = data.rowSearchPlaceholder;
  if (!text) return undefined;
  const token = text.replace(/^例：/, "").split(/[\s/／（(・、]/)[0];
  const row = data.rowZonePrefixes ? token.replace(/^\D+(?=\d)/, "") : token;
  const example = /^[0-9A-Za-z]{1,3}$/.test(row) ? row : text.match(/\d+/)?.[0];
  if (!example) return undefined;
  return `例：${compact && example.length > 1 ? (/^\d+$/.test(example) ? "5" : example[0]) : example}`;
}

/** Number pads only where every known row is a number; letters stay possible everywhere else. */
export function seatFieldKeys(data: StandMapData): { row: "numeric" | "text"; number: "numeric" | "text" } {
  const withRows = data.blocks.filter(block => block.rows.length > 0);
  const numericRows = withRows.length >= data.blocks.length * .9 && withRows.every(block => block.rows.every(row => /^\d+$/.test(row.label)));
  return { row: numericRows && !data.rowZonePrefixes ? "numeric" : "text", number: data.numberSidePrefixes ? "text" : "numeric" };
}

export type SeatPlace =
  | { kind: "zone"; zone: StandZone }
  | { kind: "position"; position: StandPosition }
  | { kind: "blocks"; blocks: StandBlock[] }
  | { kind: "level"; level: string };

// "207" finds "207扉", "E13入口" finds "E13": the noun after a name is optional.
const nameCore = (value: string) => normalizeSeatInput(value).replace(/(ブロック|ゾーン|扉|トビラ|入口|通路)$/, "");

function findSeatLevel(levels: readonly SeatFinderLevel[], query: string) {
  const digits = /^\d+$/.test(query);
  const found = levels.filter(level => {
    const name = normalizeSeatInput(level.label);
    if (name === query) return true;
    // "5" for LEVEL5, "2" for 2F, "200" for 200レベル.
    if (digits) return /^[A-Z]*\d/.test(name) && name.match(/\d+/)?.[0] === query;
    return query.length >= 2 && name.startsWith(query) && !/^\d/.test(name.slice(query.length));
  });
  return found.length === 1 ? found[0].id : null;
}

/** The place a name stands for: an exact name first, then the name without its noun, then a level. */
export function findSeatPlace(data: StandMapData, levels: readonly SeatFinderLevel[], input: string, scope: SeatFinderScope = WHOLE_VENUE): SeatPlace | null {
  const query = normalizeSeatInput(input);
  if (!query) return null;
  const core = nameCore(input);
  const inLevel = (level: string) => scope.level === "all" || scope.level === level;
  const inArea = (area: string) => scope.area === "all" || scope.area === area;
  const tests = [(name: string) => normalizeSeatInput(name) === query, (name: string) => core !== "" && nameCore(name) === core];
  for (const same of tests) {
    const zone = data.zones?.find(item => inLevel(item.level) && inArea(item.area) && [item.label, ...item.aliases].some(same));
    if (zone) return { kind: "zone", zone };
    const position = data.positionTargets?.find(item => inLevel(item.level) && [item.label, ...item.aliases].some(same));
    if (position) return { kind: "position", position };
    const blocks = data.blocks.filter(item => inLevel(item.level) && inArea(item.area)
      && ([item.label, ...item.aliases].some(same) || normalizeSeatInput(item.id) === query));
    if (blocks.length) return { kind: "blocks", blocks };
  }
  const level = findSeatLevel(levels, query);
  return level && inLevel(level) ? { kind: "level", level } : null;
}

export type SeatFinderInput = { place: string; row: string; number: string };
export type SeatFinderResult =
  /** One block. `seat`: the row and number were used, so the seat itself is marked when the block's numbers are known. */
  | { kind: "block"; block: StandBlock; seat: boolean; notice?: string }
  | { kind: "zone"; zone: StandZone; notice?: string }
  | { kind: "position"; position: StandPosition }
  | { kind: "level"; level: string }
  | { kind: "candidates"; blocks: StandBlock[]; seat: boolean }
  /** `error` is empty when the place name itself is unknown. */
  | { kind: "miss"; error: string };

export function findSeat(data: StandMapData, levels: readonly SeatFinderLevel[], input: SeatFinderInput, scope: SeatFinderScope = WHOLE_VENUE): SeatFinderResult {
  const place = input.place.trim(), seat = Boolean(input.row.trim() || input.number.trim());
  const bySeat = (level: string, area: string, zone: string | null): SeatFinderResult => {
    const found = searchStandSeats(data, level, area, input.row, input.number, zone);
    if (found.zone) return { kind: "zone", zone: found.zone, notice: found.notice };
    if (found.position) return { kind: "position", position: found.position };
    if (found.matches.length === 1) return { kind: "block", block: found.matches[0], seat: true, notice: found.notice };
    if (found.matches.length > 1) return { kind: "candidates", blocks: found.matches, seat: true };
    return { kind: "miss", error: found.error };
  };
  if (!place) return seat ? bySeat(scope.level, scope.area, scope.zone) : { kind: "miss", error: "" };
  const target = findSeatPlace(data, levels, place, scope);
  if (!target) return { kind: "miss", error: "" };
  if (target.kind === "position") return target;
  if (target.kind === "blocks") {
    // The same name can stand on more than one level: the row and number pick the one that has that seat.
    const seated = seat ? target.blocks.filter(block => standSelectedNumberRun(data, block, input.row, input.number)) : [];
    const pool = seated.length ? seated : target.blocks;
    return pool.length === 1 ? { kind: "block", block: pool[0], seat: seated.length === 1 } : { kind: "candidates", blocks: pool, seat: seated.length > 0 };
  }
  if (!seat) return target;
  // A known place whose row or number is not in the data still opens: the place is shown, the seat is not guessed.
  const found = target.kind === "zone" ? bySeat("all", "all", target.zone.id) : bySeat(target.level, "all", null);
  return found.kind === "miss" ? target : found;
}
