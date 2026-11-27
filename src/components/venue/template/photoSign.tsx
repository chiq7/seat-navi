"use client";
// The mark that says "this block has photos" on a zoomed map: the block's own photo, small and round, standing on
// the block just behind its name (the name itself never moves). Several photos show their number on the circle.
import { useEffect, useSyncExternalStore } from "react";
import { Camera } from "lucide-react";

/** How wide the round photo is on screen (its white edge included), in pixels. */
export const PHOTO_DOT = 30;
/** Sent on the window when a small photo has arrived (a map that stands as a still picture takes it again). */
export const PHOTO_SIGN_LOADED = "tixrepo-photo-sign-loaded";

// A small photo is fetched once and kept as data, so it also shows while a map stands as one still picture
// (a picture of the map cannot load anything from another site).
const pictures = new Map<string, string | null>(), listeners = new Set<() => void>();
function fetchPicture(url: string) {
  if (pictures.has(url)) return;
  pictures.set(url, null);
  fetch(url, { referrerPolicy: "no-referrer" }).then(response => response.ok ? response.blob() : Promise.reject(new Error("no picture")))
    .then(blob => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }))
    .then(data => { pictures.set(url, data); for (const tell of listeners) tell(); window.dispatchEvent(new Event(PHOTO_SIGN_LOADED)); })
    .catch(() => undefined);
}
const listen = (tell: () => void) => { listeners.add(tell); return () => { listeners.delete(tell); }; };
function usePicture(url: string | null | undefined) {
  useEffect(() => { if (url) fetchPicture(url); }, [url]);
  return useSyncExternalStore(listen, () => (url ? pictures.get(url) ?? null : null), () => null);
}

const ACCENT = "#a93164";
/** Where the circle stands: just behind the name along (ux, uy), clear of the name's own box. Screen pixels. */
export function photoDotOffset(nameWidth: number, nameHeight: number, ux: number, uy: number) {
  // far enough along the direction that the circle's box and the name's box no longer meet, sideways or up and down
  const across = Math.abs(ux) > .01 ? (nameWidth / 2 + PHOTO_DOT / 2) / Math.abs(ux) : Infinity;
  const down = Math.abs(uy) > .01 ? (nameHeight / 2 + PHOTO_DOT / 2) / Math.abs(uy) : Infinity;
  return Math.min(across, down) + 1;
}

/** The spots to try for the circle, nearest choice first, as offsets from the name's middle (screen pixels):
 *  beside a short name (a block letter or code), just behind it along (ux, uy), then just in front of it. Beside a
 *  wide name ("241番〜") that spot would be far off, so there the circle stands right above the name, then below it. */
export function photoDotSpots(nameWidth: number, nameHeight: number, ux: number, uy: number): [number, number][] {
  const along = photoDotOffset(nameWidth, nameHeight, ux, uy), upright = nameHeight / 2 + PHOTO_DOT / 2 + 1;
  const behind: [number, number][] = [[ux * along, uy * along], [-ux * along, -uy * along]], stacked: [number, number][] = [[0, -upright], [0, upright]];
  return nameWidth <= 36 ? [...behind, ...stacked] : [...stacked, ...behind];
}

/** The round photo, drawn around (0, 0) in screen pixels. */
export function PhotoDot({ id, count, thumb }: { id: string; count: number; thumb?: string | null }) {
  const picture = usePicture(thumb), clip = `photo-dot-${id}`, r = PHOTO_DOT / 2 - 2;
  return <>
    <circle r={PHOTO_DOT / 2} fill="#fff" />
    <clipPath id={clip}><circle r={r} /></clipPath>
    {picture
      // the upper part of the picture: the stage is up there, hands and goods held up are at the bottom
      ? <image href={picture} x={-r} y={-r} width={r * 2} height={r * 2.4} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${clip})`} />
      : <><circle r={r} fill="#f1e6eb" /><Camera x={-6.5} y={-6.5} size={13} color={ACCENT} strokeWidth={2.4} /></>}
    <circle r={r} fill="none" stroke="rgba(72,51,64,.2)" strokeWidth="1" />
    {count > 1 && <>
      <circle cx={10} cy={-10} r={7} fill={ACCENT} stroke="#fff" strokeWidth="1.5" />
      <text x={10} y={-10} textAnchor="middle" dominantBaseline="central" fontSize="8.5" fontWeight="800" fill="#fff">{count > 9 ? "9+" : count}</text>
    </>}
  </>;
}
