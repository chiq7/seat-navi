// The quiet marks of a chosen block ("rows are counted by their lines"): small row numbers beside the block like the
// marks of a ruler, and one round mark for the number the seats start from, with an arrow the way they count up.
// No boxes and no leader lines. Shared by the three seat maps; `unit` is the size of one screen pixel in the
// coordinates the mark is drawn in (1 on a screen-space layer, 1 / scale inside a zoomed drawing).

export const RULER_INK = "#8a2450";
const ROW_INK = "#155786";

/** Which rows get a number: the first, the last and every fifth between (not within two rows of an end), plus the
 *  searched row, which pushes aside any number within two rows of it. Returns indexes into `labels`. */
export function rulerPicks(labels: readonly string[], active?: string | null): number[] {
  const last = labels.length - 1;
  if (last < 0) return [];
  const picks = new Set<number>([0, last]);
  labels.forEach((label, index) => {
    const value = Number.parseInt(label, 10);
    const fifth = Number.isFinite(value) ? value % 5 === 0 : (index + 1) % 5 === 0;
    if (fifth && index >= 3 && index <= last - 3) picks.add(index);
  });
  const at = active == null ? -1 : labels.indexOf(active);
  if (at >= 0) {
    for (const index of [...picks]) if (index !== at && Math.abs(index - at) < 3) picks.delete(index);
    picks.add(at);
  }
  return [...picks].sort((a, b) => a - b);
}

const inkWidth = (text: string, size: number) => [...text].reduce((sum, char) => sum + size * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
/** The room a row number takes on screen, in pixels (its halo included). */
export function rowDigitSize(text: string, active = false) {
  return active ? { width: inkWidth(`${text}列`, 11) + 12, height: 18 } : { width: inkWidth(text, 10) + 2, height: 12 };
}
export const START_DISC = 21;

export function RowDigit({ x, y, text, active = false, unit = 1 }: { x: number; y: number; text: string; active?: boolean; unit?: number }) {
  if (active) {
    const { width, height } = rowDigitSize(text, true);
    return <g data-row-digit={text} data-row-active="" pointerEvents="none">
      <rect x={x - width * unit / 2} y={y - height * unit / 2} width={width * unit} height={height * unit} rx={height * unit / 2} fill={ROW_INK} stroke="#fff" strokeWidth={1.4 * unit} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={11 * unit} fontWeight="800" fill="#fff">{text}列</text>
    </g>;
  }
  return <text data-row-digit={text} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={10 * unit} fontWeight="800" fill={RULER_INK}
    stroke="#fff" strokeWidth={2.8 * unit} strokeLinejoin="round" paintOrder="stroke" pointerEvents="none">{text}</text>;
}

/** The round start-number mark. (x, y) is its middle; (ux, uy) the unit direction the numbers count up in. */
export function StartDisc({ x, y, text, ux, uy, unit = 1 }: { x: number; y: number; text: string; ux: number; uy: number; unit?: number }) {
  const r = START_DISC / 2 * unit, px = (n: number) => n * unit;
  const from = [x + ux * (r + px(2)), y + uy * (r + px(2))], to = [x + ux * (r + px(13)), y + uy * (r + px(13))];
  const shaft = `M${from[0]},${from[1]}L${to[0]},${to[1]}`;
  const head = `M${to[0] + ux * px(4.5)},${to[1] + uy * px(4.5)}L${to[0] - uy * px(3.8)},${to[1] + ux * px(3.8)}L${to[0] + uy * px(3.8)},${to[1] - ux * px(3.8)}Z`;
  return <g data-start-disc={text} pointerEvents="none">
    {/* a white edge keeps the arrow readable on the coloured block */}
    <path d={shaft} stroke="#fff" strokeWidth={px(4.4)} strokeLinecap="round" />
    <path d={head} fill="#fff" stroke="#fff" strokeWidth={px(2.4)} strokeLinejoin="round" />
    <path d={shaft} stroke={RULER_INK} strokeWidth={px(2)} strokeLinecap="round" />
    <path d={head} fill={RULER_INK} />
    <circle cx={x} cy={y} r={r} fill={RULER_INK} stroke="#fff" strokeWidth={px(1.4)} />
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={(text.length > 3 ? 7.5 : 8.5) * unit} fontWeight="800" fill="#fff">{text}</text>
  </g>;
}
/** The room the round mark and its arrow take, in pixels: a box around both. */
export function startDiscBox(x: number, y: number, ux: number, uy: number, unit = 1) {
  const reach = (START_DISC / 2 + 18) * unit, r = (START_DISC / 2 + 2) * unit;
  const left = Math.min(x - r, x + ux * reach - 5 * unit), right = Math.max(x + r, x + ux * reach + 5 * unit);
  const top = Math.min(y - r, y + uy * reach - 5 * unit), bottom = Math.max(y + r, y + uy * reach + 5 * unit);
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
}
