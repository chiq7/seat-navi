// The page behind a "この席を送る" link: LINE / X read its title and picture; a person is sent on to the seat map.
import seatShareNames from "@/data/seatShareNames.json";
import seatShareDomeNames from "@/data/seatShareDomeNames.json";
import { DEFAULT_OG_IMAGE } from "./metadata";
import { cleanSeatPart, seatShareImage, seatShareLabel, seatSharePath, seatShareTarget, SITE_ORIGIN, type SeatShare } from "./seatShare";

// Venue names and block names, written with the share pictures (scripts/og-images), so this page needs no seat maps.
// Tokyo Dome and Kyocera Dome have their own seat maps: scripts/og-images/domeNames.mts writes theirs.
const VENUES: Readonly<Record<string, { name: string; mode: string; blocks: Readonly<Record<string, string>> }>> = { ...seatShareNames, ...seatShareDomeNames };

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export type SeatSharePage = { status: 200; html: string } | { status: 302; location: string } | { status: 404 };

export function seatSharePage(venue: string, section: string, query: URLSearchParams): SeatSharePage {
  const entry = Object.hasOwn(VENUES, venue) ? VENUES[venue] : undefined;
  if (!entry) return { status: 404 };
  const blockName = Object.hasOwn(entry.blocks, section) ? entry.blocks[section] : undefined;
  if (!blockName) return { status: 302, location: `/venues/${encodeURIComponent(venue)}` };
  const share: SeatShare = { venue, section, row: cleanSeatPart(query.get("r")), number: cleanSeatPart(query.get("n")), mode: entry.mode };
  const place = seatShareLabel(blockName, share.row, share.number);
  const title = `${entry.name} ${place}の席はここ｜ちけレポ`;
  const description = `${entry.name}の座席表で、${place}の場所と席からの見え方写真を確認できます。`;
  const image = `${SITE_ORIGIN}${seatShareImage(venue, section) ?? DEFAULT_OG_IMAGE}`;
  const self = `${SITE_ORIGIN}${seatSharePath({ ...share, mode: undefined })}`;
  // Keep the share tags (utm_*) so GA4 sees where the visit came from after the hop to the seat map.
  const tags = [...query].filter(([key]) => /^utm_(source|medium|campaign)$/.test(key) && /^[\w-]{1,40}$/.test(query.get(key) ?? ""));
  const target = tags.length ? seatShareTarget(share).replace("#", `&${new URLSearchParams(tags)}#`) : seatShareTarget(share);
  const t = escape(title), d = escape(description), i = escape(image), u = escape(self), go = escape(target);
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title><meta name="description" content="${d}"><meta name="robots" content="noindex,follow">
<link rel="canonical" href="${SITE_ORIGIN}/venues/${escape(encodeURIComponent(venue))}">
<meta property="og:type" content="website"><meta property="og:site_name" content="ちけレポ"><meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${t}"><meta property="og:description" content="${d}"><meta property="og:url" content="${u}">
<meta property="og:image" content="${i}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escape(`${entry.name}の座席表で${place}の場所`)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${t}"><meta name="twitter:description" content="${d}"><meta name="twitter:image" content="${i}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fff7fa;color:#59283e}
a{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:14px;background:#a93164;color:#fff;font-weight:800;text-decoration:none}</style>
</head><body><main style="text-align:center;padding:24px"><p>${escape(entry.name)}　${escape(place)}</p><a href="${go}">座席表で見る</a></main>
<script>location.replace(${JSON.stringify(target).replace(/</g, "\\u003c")})</script></body></html>`;
  return { status: 200, html };
}
