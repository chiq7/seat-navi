import { VENUES } from "./eventCrawlerConfig";
import { findArtistByKeyword } from "./artists";
import { getPublicVenueGuideId, getPublicVenueName, getPublicVenueSeatGuideHref } from "./publicVenueGuides";
import { seatViewPosts } from "./seatViewPosts";
import { seatViewInlinePhotoUrl, seatViewPhotoSourceUrl, seatViewXStatusId } from "./seatViewPhotoAssets";
import { getArtistSeatGuideVenues } from "./artistSeatGuide";
import { getVenueArenaPhotoArchives } from "../data/venueArenaPhotoArchives";
import { getEventArenaPhotoLayout, type EventArenaPhotoLayout } from "./eventArenaPhotos";
import { venueSeatSectionHref } from "./venueSeatLinks";
import type { CrawledEvent } from "./types";

// Diagram IDs are the same IDs used by the existing public maps. Only reviewed,
// available images are counted; held photos and alternate modes are deduplicated.
const diagrams: Readonly<Record<string, readonly string[]>> = {
  "tokyo-dome": ["tokyo-dome-fixed"], "kyocera-dome": ["kyocera-dome-fixed"],
  "k-arena": ["k-arena-permanent-stands"], "sapporo-dome": ["sapporo-baseball"],
  "saitama-super-arena": ["ssa-seat-arena", "ssa-seat-stadium"],
  "gaishi-hall": ["gaishi-fixed"], "koshien": ["koshien-seats"],
  "ariake-arena": ["ariake-fixed-stand"], "belluna-dome": ["belluna-seats"],
  "budokan": ["budokan-reference-stands"], "hiroshima-arena": ["hiroshima-stand"],
  "makuhari-messe": ["makuhari-seats"], "marine-messe": ["marine-center", "marine-concert"],
  "miyagi-arena": ["miyagi-stand"], "mufg-stadium": ["mufg-seats"],
  "nissan-stadium": ["nissan-seats"], "osaka-jo-hall": ["osaka-stand-current"],
  "paypay-dome": ["paypay-stand-reference"], "pia-arena-mm": ["pia-arena-mm-seat-plans"],
  "tokyo-garden-theater": ["tokyo-garden-theater-seat-plans"],
  "vantelin-dome": ["vantelin-seat-reference"], "yokohama-arena": ["ya-common-bowl-current"],
  "yoyogi": ["yoyogi-stand-reference"], "zozo-marine": ["zozo-seats"],
};

export type SeatPhotoVenue = { id: string; name: string; href: string; count: number };

type PreviewTile = { thumbnailUrl: string; label: string; href: string };
export type EventVenuePhotoPreview = SeatPhotoVenue & { photos: PreviewTile[] };

const modesByDiagram: Readonly<Record<string, string>> = {
  "makuhari-seats": "event", "marine-concert": "concert", "marine-center": "center",
  "sapporo-baseball": "baseball", "ssa-seat-arena": "arena", "ssa-seat-stadium": "stadium",
};

type GalleryImage = {
  seatVerified?: boolean;
  date?: string;
  performance?: string;
  source?: string;
  imageUrl: string;
  section: string;
  postedAt: number;
  label: string;
  href: string;
};

function photoTimestamp(url: string, imageUrl: string, fallbackDate?: string) {
  const status = seatViewXStatusId({ url });
  if (status) return Number(BigInt(status) >> BigInt(22)) + 1288834974657;
  const noteUpload = imageUrl.match(/^https:\/\/assets\.st-note\.com\/img\/(\d{10})-/);
  return noteUpload ? Number(noteUpload[1]) * 1000 : fallbackDate ? Date.parse(fallbackDate) : 0;
}

function thumbnailUrl(imageUrl: string) {
  const url = new URL(imageUrl);
  if (url.hostname === "pbs.twimg.com") url.searchParams.set("name", "thumb");
  else if (url.hostname === "assets.st-note.com") url.searchParams.set("width", "240");
  else return null;
  return url.href;
}

function photoIdentity(image: string): string {
  const url = new URL(image, "https://tixrepo.com");
  if (url.hostname === "pbs.twimg.com" && url.pathname.startsWith("/media/")) {
    return "x:" + url.pathname.slice("/media/".length).replace(/\.(?:jpe?g|webp|png)$/i, "");
  }
  if (url.hostname === "assets.st-note.com") return url.origin + url.pathname;
  url.searchParams.sort();
  return url.href;
}

/** The same photo can appear on the show's map and among the six venue previews. */
export function getRenderedEventPhotos(layout: EventArenaPhotoLayout | null, venue: EventVenuePhotoPreview | null, reportCount: number | null) {
  const showPreview = reportCount !== null && reportCount <= 3;
  const images = new Set(showPreview ? venue?.photos.map(photo => photoIdentity(photo.thumbnailUrl)) : []);
  for (const photo of layout?.photos ?? []) {
    const image = seatViewInlinePhotoUrl(photo);
    if (image) images.add(photoIdentity(image));
  }
  return { showPreview, count: images.size };
}

// Only the two galleries rendered by /venues/[id] belong in its count. Photos on
// individual event pages may have different layouts and no link from this venue.
const galleryByVenue = new Map<string, GalleryImage[]>();
function venueGalleryImages(id: string, href: string): GalleryImage[] {
  const cached = galleryByVenue.get(id);
  if (cached) return cached;
  const fixed = (diagrams[id] ?? []).flatMap(diagram => seatViewPosts(diagram).flatMap(post => {
    const imageUrl = seatViewInlinePhotoUrl(post);
    if (!imageUrl) return [];
    const section = post.place.id;
    const location = post.row ? `${post.area}・${post.row}列` : post.area;
    return [{
      imageUrl, section, performance: post.event, seatVerified: post.seatVerified, source: seatViewPhotoSourceUrl(post), postedAt: photoTimestamp(post.url, imageUrl),
      label: post.event?.includes("改修前") ? `${location}（改修前）` : location,
      href: post.place.kind === "position" ? `${href}#venue-seat-guide`
        : venueSeatSectionHref(id, { mode: modesByDiagram[diagram] ?? "fixed", section }),
    }];
  }));
  const arena = getVenueArenaPhotoArchives(id).flatMap(({ id: archiveId, layout, kind, title }) =>
    layout.photos.flatMap(photo => {
      const imageUrl = seatViewInlinePhotoUrl(photo);
      if (!imageUrl) return [];
      const area = kind === "standing" ? "スタンディング" : "アリーナ";
      const row = photo.row ? `・${photo.row}列` : "";
      return [{
        imageUrl, section: `${archiveId}/${photo.block}`, performance: title, date: layout.date, seatVerified: photo.seatVerified, source: seatViewPhotoSourceUrl(photo),
        postedAt: photoTimestamp(photo.url, imageUrl, layout.date),
        label: `${area} ${photo.block}ブロック${row}`,
        href: `${href}#arena-seat-photos-${archiveId}`,
      }];
    }));
  const gallery = [...fixed, ...arena];
  galleryByVenue.set(id, gallery);
  return gallery;
}

const eventPreviews = new Map<string, EventVenuePhotoPreview>();

export type ScopedSeatPhoto = { image: string; thumbnail: string; label: string; href: string; venue: string; event?: string; source?: string; seatVerified?: boolean };

function galleryTile(id: string, name: string, photo: GalleryImage): ScopedSeatPhoto {
  return { image: photo.imageUrl, thumbnail: thumbnailUrl(photo.imageUrl) ?? photo.imageUrl,
    label: photo.label, href: photo.href, venue: getPublicVenueName(id, name), event: [photo.date, photo.performance].filter(Boolean).join(" "), seatVerified: photo.seatVerified, source: photo.source };
}

export function getDirectorySeatPhotos(): ScopedSeatPhoto[] {
  return VENUES.flatMap(venue => {
    const photos = venueGalleryImages(venue.id, `/venues/${venue.id}`);
    const latest = photos.reduce<GalleryImage | undefined>((best, item) => !best || item.postedAt > best.postedAt ? item : best, undefined);
    return latest ? [galleryTile(venue.id, venue.name, latest)] : [];
  });
}

/** Only credited performances or gallery records linked to a known performance ID. */
const creditedNames = new Map<string, string | undefined>();

export function getArtistSeatPhotos(name: string, events: readonly CrawledEvent[]): ScopedSeatPhoto[] {
  const normalizedName = name.normalize("NFKC").toLowerCase();
  const results = new Map<string, ScopedSeatPhoto>();
  for (const venue of VENUES) {
    const id = venue.id;
    for (const photo of venueGalleryImages(id, `/venues/${id}`)) {
      if (!photo.performance) continue;
      const title = photo.performance.normalize("NFKC").toLowerCase().replace(/^\d{4}年\d{1,2}月\d{1,2}日[・\s]*/, "");
      if (!title.startsWith(normalizedName)) continue;
      const rest = title.slice(normalizedName.length);
      if (rest && !/^(?:[\s「（(・]|の過去公演|とうちあげ花火)/u.test(rest)) continue;
      if (!creditedNames.has(title)) creditedNames.set(title, findArtistByKeyword(title)?.name);
      if (creditedNames.get(title) !== name) continue;
      results.set(photo.imageUrl, galleryTile(id, venue.name, photo));
    }
  }
  for (const event of events) {
    const layout = getEventArenaPhotoLayout(event);
    if (!layout) continue;
    for (const photo of layout.photos) {
      const image = seatViewInlinePhotoUrl(photo);
      if (!image) continue;
      results.set(image, { image, thumbnail: thumbnailUrl(image) ?? image, source: seatViewPhotoSourceUrl(photo),
        label: `アリーナ ${photo.block}ブロック${photo.row ? `・${photo.row}列` : ""}`,
        href: `/events/${encodeURIComponent(event.id)}#arena-seat-photos`, venue: event.venue, seatVerified: photo.seatVerified, event: `${layout.date} ${event.title}` });
    }
  }
  return [...results.values()];
}

/** All reviewed public photos, grouped by where their existing gallery opens. */
export function getVenuePhotoIndex(id: string) {
  const images = venueGalleryImages(id, `/venues/${encodeURIComponent(id)}`);
  const seen = new Set<string>();
  const groups = new Map<string, { label: string; href: string; count: number }>();
  for (const image of images) {
    if (seen.has(image.imageUrl)) continue;
    seen.add(image.imageUrl);
    const key = image.href + "\n" + image.label;
    const group = groups.get(key);
    if (group) group.count++;
    else groups.set(key, { label: image.label, href: image.href, count: 1 });
  }
  return [...groups.values()];
}

/** Same groups as getVenuePhotoIndex, each with the newest photo's small thumbnail as its cover. */
export function getVenuePhotoCovers(id: string) {
  const images = [...venueGalleryImages(id, `/venues/${encodeURIComponent(id)}`)].sort((a, b) => b.postedAt - a.postedAt);
  const seen = new Set<string>();
  const groups = new Map<string, { label: string; href: string; count: number; thumbnailUrl: string | null }>();
  for (const image of images) {
    if (seen.has(image.imageUrl)) continue;
    seen.add(image.imageUrl);
    const key = image.href + "\n" + image.label;
    const group = groups.get(key);
    if (group) { group.count++; group.thumbnailUrl ??= thumbnailUrl(image.imageUrl) ?? null; }
    else groups.set(key, { label: image.label, href: image.href, count: 1, thumbnailUrl: thumbnailUrl(image.imageUrl) ?? null });
  }
  return [...groups.values()];
}

export function getEventVenuePhotoPreview(
  venueId: string | null | undefined, venueName?: string | null,
): EventVenuePhotoPreview | null {
  const id = getPublicVenueGuideId(venueId, venueName);
  if (!id) return null;
  const cached = eventPreviews.get(id);
  if (cached) return cached;
  const href = `/venues/${encodeURIComponent(id)}`;
  const name = getPublicVenueName(id, VENUES.find(venue => venue.id === id)!.name);
  const images = [...venueGalleryImages(id, href)].sort((a, b) => b.postedAt - a.postedAt);
  const seenImages = new Set<string>();
  const seenSections = new Set<string>();
  type TimedTile = { tile: PreviewTile; postedAt: number };
  const distinct: TimedTile[] = [];
  const sameSection: TimedTile[] = [];
  for (const image of images) {
    if (seenImages.has(image.imageUrl)) continue;
    seenImages.add(image.imageUrl);
    const small = thumbnailUrl(image.imageUrl);
    if (!small) continue;
    const entry = { postedAt: image.postedAt, tile: { thumbnailUrl: small, label: image.label, href: image.href } };
    if (seenSections.has(image.section)) sameSection.push(entry);
    else distinct.push(entry);
    seenSections.add(image.section);
  }
  const photos = [...distinct, ...sameSection].slice(0, 6).sort((a, b) => b.postedAt - a.postedAt)
    .map(entry => entry.tile);
  const preview = { id, name, href, count: seenImages.size, photos };
  eventPreviews.set(id, preview);
  return preview;
}

/** Server use only: do not send the complete photo ledger to artist-page clients. */
export function getVenuePhotoCounts(): Readonly<Record<string, number>> {
  return Object.fromEntries(VENUES.map(venue => [venue.id, getEventVenuePhotoPreview(venue.id)?.count ?? 0]));
}

export function getSeatPhotoVenues(): SeatPhotoVenue[] {
  return VENUES.flatMap(venue => {
    const href = getPublicVenueSeatGuideHref(venue.id);
    if (!href) return [];
    const images = new Set((diagrams[venue.id] ?? []).flatMap(diagram =>
      seatViewPosts(diagram).flatMap(post => seatViewInlinePhotoUrl(post) ?? [])));
    return images.size ? [{ id: venue.id, name: getPublicVenueName(venue.id, venue.name), href, count: images.size }] : [];
  });
}

export function getArtistSeatPhotoVenues(slug: string, events: readonly CrawledEvent[]): SeatPhotoVenue[] {
  const available = new Map(getSeatPhotoVenues().map(venue => [venue.id, venue]));
  return getArtistSeatGuideVenues(slug, events).flatMap(venue => available.get(venue.id) ?? []);
}
