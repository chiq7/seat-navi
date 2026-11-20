import eventArenaPhotoData from "@/data/eventArenaPhotos.json";
import { reviewedSeatPhotos } from "@/lib/seatViewPhotoAssets";
import type { CrawledEvent } from "@/lib/types";

type Point = readonly [number, number];
type ViewBox = readonly [number, number, number, number];

type ArenaPhotoBlock = {
  id: string;
  points: readonly Point[];
  approximate?: boolean;
};

type ArenaPhoto = {
  block: string;
  url: string;
  photo?: number;
  source: string;
  positionLabel?: string;
  row?: string;
  seat?: string;
  seatVerified?: boolean;
};

export type EventArenaPhotoLayout = {
  date: string;
  venueId: string;
  featuredPhotoBlock?: string;
  layoutSource: string;
  viewBox: ViewBox;
  stage?: readonly Point[];
  subStage?: readonly Point[];
  blocks: ArenaPhotoBlock[];
  photos: ArenaPhoto[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): value is string {
  if (!isText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isViewBox(value: unknown): value is ViewBox {
  return Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) && value[2] > 0 && value[3] > 0;
}

function isPolygon(value: unknown, [x, y, width, height]: ViewBox): value is readonly Point[] {
  if (!Array.isArray(value) || value.length < 3 || !value.every(point =>
    Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) &&
    point[0] >= x && point[0] <= x + width && point[1] >= y && point[1] <= y + height)) return false;
  return value.reduce((area, [pointX, pointY], index) => {
    const [nextX, nextY] = value[(index + 1) % value.length];
    return area + pointX * nextY - nextX * pointY;
  }, 0) !== 0;
}

function isArenaPhoto(value: unknown, blockIds: ReadonlySet<string>): value is ArenaPhoto {
  if (!isRecord(value) || !isText(value.block) || !blockIds.has(value.block) ||
    !isHttpsUrl(value.url) || !isHttpsUrl(value.source)) return false;
  const url = new URL(value.url);
  const source = new URL(value.source);
  const note = value.url.startsWith("https://note.com/") && /^\/[^/]+\/n\/[^/]+\/?$/.test(url.pathname) && !!url.hash;
  const xPost = /^https:\/\/(?:x\.com|twitter\.com)\/(?:[\w]+|i\/web)\/status\/\d+$/.test(value.url);
  const hatenaPhoto = url.hostname === "cdn-ak.f.st-hatena.com" && source.hostname.endsWith(".hatenablog.com") &&
    source.pathname.startsWith("/entry/") && /^\/images\/fotolife\/\w\/\w+\/\d{8}\/\d{14}\.jpe?g$/i.test(url.pathname);
  const amebaEntry = source.hostname === "ameblo.jp" ? source.pathname.match(/^\/([\w-]+)\/entry-\d+\.html$/) : null;
  const amebaPhoto = amebaEntry && url.hostname === "stat.ameba.jp" &&
    /^\/user_images\/\d{8}\/\d{2}\/[\w-]+\/[\da-f]{2}\/[\da-f]{2}\/j\/o\d+\.jpe?g$/i.test(url.pathname) &&
    url.pathname.split("/")[4] === amebaEntry[1];
  if (!((note || hatenaPhoto || amebaPhoto) && value.photo === undefined) &&
    !(xPost && Number.isSafeInteger(value.photo) && Number(value.photo) >= 1)) return false;
  if (value.positionLabel !== undefined && !isText(value.positionLabel)) return false;
  if (value.row !== undefined && !isText(value.row)) return false;
  if (value.seat !== undefined && !isText(value.seat)) return false;
  if (value.seatVerified === true) return isText(value.row) && isText(value.seat);
  return value.seatVerified === undefined || value.seatVerified === false;
}

export function getEventArenaPhotoLayout(
  event: Pick<CrawledEvent, "id" | "date" | "venue_id">,
  catalog: Readonly<Record<string, unknown>> = eventArenaPhotoData,
): EventArenaPhotoLayout | null {
  const layout = Object.hasOwn(catalog, event.id) ? catalog[event.id] : null;
  if (!isRecord(layout) || !isText(event.date) || !isText(event.venue_id) ||
    layout.date !== event.date || layout.venueId !== event.venue_id ||
    !isHttpsUrl(layout.layoutSource) || !isViewBox(layout.viewBox) ||
    !Array.isArray(layout.blocks) || !Array.isArray(layout.photos)) return null;
  const { viewBox } = layout;
  const blocks = layout.blocks.filter((block): block is ArenaPhotoBlock =>
    isRecord(block) && isText(block.id) && isPolygon(block.points, viewBox) &&
    (block.approximate === undefined || typeof block.approximate === "boolean"));
  const blockIds = new Set(blocks.map(block => block.id));
  if (blocks.length !== layout.blocks.length || blockIds.size !== blocks.length) return null;
  const photos = reviewedSeatPhotos(
    layout.photos.filter((photo): photo is ArenaPhoto => isArenaPhoto(photo, blockIds)),
    photo => JSON.stringify([photo.block, photo.positionLabel, photo.row, photo.seat, photo.seatVerified]),
  );
  if (photos.length === 0) return null;
  return {
    date: event.date,
    venueId: event.venue_id,
    featuredPhotoBlock: typeof layout.featuredPhotoBlock === "string" && photos.some(photo => photo.block === layout.featuredPhotoBlock)
      ? layout.featuredPhotoBlock : undefined,
    layoutSource: layout.layoutSource,
    viewBox,
    stage: isPolygon(layout.stage, viewBox) ? layout.stage : undefined,
    subStage: isPolygon(layout.subStage, viewBox) ? layout.subStage : undefined,
    blocks,
    photos,
  };
}
