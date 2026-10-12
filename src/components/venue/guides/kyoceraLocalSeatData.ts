import initial from "@/data/venueGuides/kyocera-dome/seat-local-details.json";
import additions from "@/data/venueGuides/kyocera-dome/seat-local-additions.json";
import central from "@/data/venueGuides/kyocera-dome/seat-local-central.json";
import fl from "@/data/venueGuides/kyocera-dome/seat-local-fl.json";
import upper8 from "@/data/venueGuides/kyocera-dome/seat-local-upper8.json";
import upperNext8 from "@/data/venueGuides/kyocera-dome/seat-local-upper-next8.json";
import upper10 from "@/data/venueGuides/kyocera-dome/seat-local-upper10.json";
import upper14 from "@/data/venueGuides/kyocera-dome/seat-local-upper14.json";
import upper18 from "@/data/venueGuides/kyocera-dome/seat-local-upper18.json";
import upper22 from "@/data/venueGuides/kyocera-dome/seat-local-upper22.json";
import upper26 from "@/data/venueGuides/kyocera-dome/seat-local-upper26.json";
import upper30 from "@/data/venueGuides/kyocera-dome/seat-local-upper30.json";
import upper36 from "@/data/venueGuides/kyocera-dome/seat-local-upper36.json";
import upper42 from "@/data/venueGuides/kyocera-dome/seat-local-upper42.json";
import upper50 from "@/data/venueGuides/kyocera-dome/seat-local-upper50.json";
import upper58 from "@/data/venueGuides/kyocera-dome/seat-local-upper58.json";

import upper66 from "@/data/venueGuides/kyocera-dome/seat-local-upper66.json";

import lower01 from "@/data/venueGuides/kyocera-dome/seat-local-lower01.json";

import lower05 from "@/data/venueGuides/kyocera-dome/seat-local-lower05.json";

import lower11 from "@/data/venueGuides/kyocera-dome/seat-local-lower11.json";

import lower15 from "@/data/venueGuides/kyocera-dome/seat-local-lower15.json";

import lower19 from "@/data/venueGuides/kyocera-dome/seat-local-lower19.json";

import lower23 from "@/data/venueGuides/kyocera-dome/seat-local-lower23.json";

export type LocalSeatSegment = {
  id: string; start: number; end: number; polygon: number[][];
  startLabel: number[]; endLabel: number[];
  ranges?: { start: number; end: number }[];
  endpointLabels?: { number: number; x: number; y: number; anchor?: number[] }[];
  labelAngle?: number;
};
export type LocalSeatDetail = {
  code: string; areaId: string; name: string; level: string; viewBox: number[];
  sourceUrl: string; sourceSha256: string; special?: boolean; note?: string;
  rows: { row: string; label: number[] | null; segments: LocalSeatSegment[] }[];
  passage: { number: string; x: number; y: number } | null;
  overview?: { x: number; y: number; paths: string[]; sourceUrl: string; sourceSha256: string };
  rowAnnotations?: { row: string; x: number; y: number }[];
};
export const kyoceraLocalDetails = [...initial.diagrams, ...additions.diagrams, ...central.diagrams, ...fl.diagrams, ...upper8.diagrams, ...upperNext8.diagrams, ...upper10.diagrams, ...upper14.diagrams, ...upper18.diagrams, ...upper22.diagrams, ...upper26.diagrams, ...upper30.diagrams, ...upper36.diagrams, ...upper42.diagrams, ...upper50.diagrams, ...upper58.diagrams, ...upper66.diagrams, ...lower01.diagrams, ...lower05.diagrams, ...lower11.diagrams, ...lower15.diagrams, ...lower19.diagrams, ...lower23.diagrams] as LocalSeatDetail[];
export function localSegmentRanges(segment: LocalSeatSegment) { return segment.ranges ?? [{ start: segment.start, end: segment.end }]; }
export function localSegmentContains(segment: LocalSeatSegment, number: number) { return localSegmentRanges(segment).some(range => number >= range.start && number <= range.end); }
