"use client";

import { memo, useMemo } from "react";
import { useGuideControlId } from "../GuideControlScope";
import type { StandBlock } from "./standMap";

type Footprint = { id: string; path: string; level: string };
type Profile = { turf?: boolean; separateLevels?: boolean; floor?: string };
// Presentation only: these soft floor washes are not seat, aisle or stage geometry.
// All clickable outlines, numbers and detailed drawings still come from the source data.
export const VENUE_OVERVIEW_PROFILES: Record<string, Profile> = {
  "kyocera-seat-original": { turf: true, floor: "M405 495 Q800 285 1195 495 L1195 820 Q1080 1045 800 1220 Q520 1045 405 820 Z" },
  "paypay-stand-reference": { turf: true, floor: "M390 520 Q835 330 1280 520 L1260 820 Q1050 1100 835 1250 Q620 1100 410 820 Z" },
  "vantelin-seat-reference": { turf: true, floor: "M440 700 Q840 480 1240 700 L1220 930 Q1040 1140 840 1295 Q640 1140 460 930 Z" },
  "belluna-seats": { turf: true, floor: "M295 365 Q595 225 895 365 L890 560 Q750 735 595 865 Q440 735 300 560 Z" },
  "sapporo-baseball": { turf: true, floor: "M205 400 Q365 305 525 400 L530 580 Q450 690 365 770 Q280 690 200 580 Z" },
  "sapporo-soccer": { turf: true, floor: "M190 320 Q190 300 210 300 H390 Q410 300 410 320 V575 Q410 595 390 595 H210 Q190 595 190 575 Z" },
  "koshien-seats": { turf: true, floor: "M500 620 Q1048 290 1596 620 L1510 1030 Q1290 1320 1048 1530 Q805 1320 585 1030 Z" },
  "zozo-seats": { turf: true, floor: "M460 610 Q900 355 1340 610 L1320 880 Q1100 1130 900 1280 Q700 1130 480 880 Z" },
  "mufg-seats": { turf: true, floor: "M810 690 H2030 Q2250 690 2250 1090 Q2250 1490 2030 1490 H810 Q590 1490 590 1090 Q590 690 810 690 Z" },
  "nissan-seats": { turf: true, floor: "M520 400 H1255 Q1350 400 1350 500 V930 Q1350 1030 1255 1030 H520 Q425 1030 425 930 V500 Q425 400 520 400 Z" },
  "osaka-stand-current": { floor: "M425 295 H895 Q1040 295 1040 480 Q1040 665 895 665 H425 Q280 665 280 480 Q280 295 425 295 Z" },
  "ya-common-bowl-current": { floor: "M340 285 Q625 210 900 305 L1000 540 Q880 690 615 710 L310 590 Q250 430 340 285 Z" },
  "ariake-fixed-stand": { floor: "M355 230 H825 V610 H355 Z" },
  "budokan-reference-stands": { floor: "M400 300 H600 L700 400 V600 L600 700 H400 L300 600 V400 Z" },
  "yoyogi-stand-reference": { floor: "M200 200 Q355 155 510 200 L505 335 Q355 385 205 335 Z" },
  "gaishi-fixed": { floor: "M320 355 H760 Q900 355 900 545 Q900 735 760 735 H320 Q180 735 180 545 Q180 355 320 355 Z" },
  "gaishi-bleacher": { floor: "M320 355 H760 Q900 355 900 545 Q900 735 760 735 H320 Q180 735 180 545 Q180 355 320 355 Z" },
  "marine-concert": { floor: "M440 505 H975 V1095 H440 Z" },
  "marine-center": { floor: "M440 505 H975 V1095 H440 Z" },
  "hiroshima-stand": { floor: "M310 210 H790 Q930 210 930 400 Q930 590 790 590 H310 Q170 590 170 400 Q170 210 310 210 Z" },
  "edion-fixed-seats": { floor: "M160 250 H840 V610 H160 Z" },
  "miyagi-stand": { floor: "M170 325 H690 V690 H170 Z" },
  "makuhari-seats": { floor: "M260 345 H740 Q820 345 820 530 Q820 715 740 715 H260 Q180 715 180 530 Q180 345 260 345 Z" },
  "ssa-seat-arena": { floor: "M1280 1100 H2420 V2750 H1280 Z" },
  "ssa-seat-stadium": { floor: "M680 650 H1870 V1530 H680 Z" },
  "k-arena-permanent-stands": {},
  "pia-arena-mm-seat-plans": { separateLevels: true },
  "tokyo-garden-theater-seat-plans": { separateLevels: true },
  "vantelin-prime-unfolded": { separateLevels: true },
  "toki-seats-exhibition": { separateLevels: true },
  "toki-seats-main": { separateLevels: true },
  "makuhari-exhibition-seats": { separateLevels: true },
  "edion-second-seats": { separateLevels: true },
};

// Only linear source outlines are eligible. Never interpret curve/arc control
// points as the footprint of a stand. Unsupported outlines retain the old view.
export function overviewFootprint(paths: string[]) {
  const points = paths.flatMap(path => {
    if (/[^MLZmlz\d\s, .+\-]/.test(path) || /[ml]/.test(path)) return [];
    const n = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    return Array.from({ length: Math.floor(n.length / 2) }, (_, i) => [n[i * 2], n[i * 2 + 1]]);
  }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (points.length < 3) return "";
  const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const half = (values: number[][]) => { const out: number[][] = []; for (const p of values) { while (out.length > 1 && cross(out.at(-2)!, out.at(-1)!, p) <= 0) out.pop(); out.push(p); } return out.slice(0, -1); };
  return `M${[...half(points), ...half([...points].reverse())].map(p => p.join(",")).join(" L")} Z`;
}

export function overviewArtworkOpacity(width: number, overviewWidth: number, detailSpan: number) {
  const end = Math.max(detailSpan * 1.25, overviewWidth * .36);
  return Math.max(0, Math.min(1, (width - end) / Math.max(1, overviewWidth * .82 - end)));
}

const VenueOverviewGeometry = memo(function VenueOverviewGeometry({ diagramId, blocks, unit }: {
  diagramId: string; blocks: Footprint[]; unit: number;
}) {
  const id = useGuideControlId("seat-art").replace(/:/g, "");
  const profile = VENUE_OVERVIEW_PROFILES[diagramId];
  const shells = useMemo(() => {
    if (!profile) return [];
    const groups = profile.separateLevels ? [...new Set(blocks.map(b => b.level))].map(level => blocks.filter(b => b.level === level)) : [blocks];
    return groups.map(group => overviewFootprint(group.map(b => b.path))).filter(Boolean);
  }, [blocks, profile]);
  if (!profile) return null;
  return <g pointerEvents="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f8fafb"/><stop offset="1" stopColor="#e7edf0"/></linearGradient>
      <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={profile.turf ? "#a3c5b4" : "#e5e9e7"}/><stop offset="1" stopColor={profile.turf ? "#c5dbce" : "#f1f0e9"}/></linearGradient>
      <pattern id={`${id}-stripes`} width={unit * 8} height={unit * 8} patternUnits="userSpaceOnUse"><rect width={unit * 4} height={unit * 8} fill="#fff" opacity=".09"/></pattern>
    </defs>
    {shells.map((d, i) => <g key={i}>
      <path d={d} fill="#cbd5dc" stroke="#cbd5dc" strokeWidth={unit * 2.4} strokeLinejoin="round" transform={`translate(0 ${unit * 1.2})`}/>
      <path d={d} fill={`url(#${id}-shell)`} stroke="#fff" strokeWidth={unit * 1.4} strokeLinejoin="round"/>
    </g>)}
    {profile.floor && <g><path d={profile.floor} fill={`url(#${id}-floor)`} stroke="#fff" strokeWidth={unit * 1.1} strokeLinejoin="round"/>
      {profile.turf && <path d={profile.floor} fill={`url(#${id}-stripes)`}/>}</g>}
    <g transform={`translate(0 ${unit * .55})`} fill="#637382" opacity=".2">{blocks.map(b => <path key={b.id} d={b.path} fillRule="evenodd"/>)}</g>
  </g>;
});

const StandOverviewRows = memo(function StandOverviewRows({ blocks, selected, unit }: {
  blocks: StandBlock[]; selected: string | null; unit: number;
}) {
  const id = useGuideControlId("seat-texture").replace(/:/g, "");
  const rows = useMemo(() => blocks.map(b => {
    const source = b.rows.length ? b.rows.map(r => r.segments.map(s => s.points ?? [s.a, s.b])) : (b.referenceRows ?? []).map(r => [[r.a, r.b]]);
    const step = Math.max(1, Math.ceil(source.length / 5));
    const d = source.filter((_, i) => i % step === 0).flatMap(row => row.map(points => `M${points.map(p => p.join(",")).join(" L")}`)).join(" ");
    return { id: b.id, path: b.path, d };
  }), [blocks]);
  return <g pointerEvents="none" aria-hidden="true">
    <defs><linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".28"/><stop offset=".5" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#293c50" stopOpacity=".12"/></linearGradient>
      {rows.filter(b => b.d).map(b => <clipPath id={`${id}-${b.id}`} key={b.id}><path d={b.path} fillRule="evenodd"/></clipPath>)}
    </defs>
    {rows.filter(b => b.id !== selected).map(b => <g key={b.id}>
      <path d={b.path} fill={`url(#${id}-light)`} fillRule="evenodd"/>
      {b.d && <path d={b.d} fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth={unit * .14} clipPath={`url(#${id}-${b.id})`}/>}
    </g>)}
  </g>;
});


export function VenueOverviewArt({ opacity, ...props }: { diagramId: string; blocks: Footprint[]; opacity: number; unit: number }) {
  return opacity > 0 ? <g pointerEvents="none" aria-hidden="true" opacity={opacity} data-overview-art={props.diagramId}><VenueOverviewGeometry {...props}/></g> : null;
}
export function StandOverviewTexture({ opacity, ...props }: { blocks: StandBlock[]; opacity: number; selected: string | null; unit: number }) {
  return opacity > 0 ? <g pointerEvents="none" aria-hidden="true" opacity={opacity} data-overview-texture=""><StandOverviewRows {...props}/></g> : null;
}
