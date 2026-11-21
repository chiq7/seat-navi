"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronRight } from "lucide-react";
import { TOKYO_DOME_MAP_SCOPE_EVENT, readTokyoDomeMapScope, type TokyoDomeMapScope } from "@/lib/tokyoDomeVenueSelection";
import OpenDetailsLink from "./OpenDetailsLink";
import SeatPhotoPostLink from "./SeatPhotoPostLink";
import styles from "./VenuePhotoStrip.module.css";

export type StripPhoto = { label: string; href: string; count: number; thumbnailUrl: string | null };

const SHOWN = 12;
const blockCode = (photo: StripPhoto) => photo.label.match(/([A-Z]\d{1,3})/)?.[1] ?? null;

/** Before anything is chosen: take turns between the seat tiers so the row is not one corner of the venue. */
function mixedByTier(photos: StripPhoto[]) {
  const tiers = new Map<string, StripPhoto[]>();
  for (const photo of photos) {
    const key = blockCode(photo)?.[0] ?? "~";
    tiers.set(key, [...(tiers.get(key) ?? []), photo]);
  }
  const queues = [...tiers.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, list]) => list);
  const mixed: StripPhoto[] = [];
  for (let turn = 0; mixed.length < photos.length; turn++) for (const queue of queues) if (queue[turn]) mixed.push(queue[turn]);
  return mixed;
}

/**
 * Seat-view photos as one swipeable row, directly under the seat search. Once a floor, a side or a
 * block is chosen on the seat map, photos from that part of the venue move to the front.
 */
export default function VenuePhotoStrip({ photos, count, allTargetId, venueId, venueName }: { photos: StripPhoto[]; count: number; allTargetId: string; venueId: string; venueName: string }) {
  const row = useRef<HTMLUListElement>(null);
  const [scope, setScope] = useState<TokyoDomeMapScope | null>(null);
  const withImage = useMemo(() => mixedByTier(photos.filter(photo => photo.thumbnailUrl)), [photos]);

  useEffect(() => {
    const update = (event: Event) => setScope((event as CustomEvent<TokyoDomeMapScope>).detail);
    setScope(readTokyoDomeMapScope());
    window.addEventListener(TOKYO_DOME_MAP_SCOPE_EVENT, update);
    return () => window.removeEventListener(TOKYO_DOME_MAP_SCOPE_EVENT, update);
  }, []);

  const { ordered, matched, matchedPhotos } = useMemo(() => {
    const rank = new Map((scope?.codes ?? []).map((code, index) => [code, index]));
    const near = withImage.filter(photo => rank.has(blockCode(photo) ?? ""))
      .sort((a, b) => rank.get(blockCode(a)!)! - rank.get(blockCode(b)!)!);
    return { ordered: [...near, ...withImage.filter(photo => !near.includes(photo))], matched: near.length, matchedPhotos: near.reduce((sum, photo) => sum + photo.count, 0) };
  }, [withImage, scope]);
  useEffect(() => { row.current?.scrollTo({ left: 0 }); }, [scope]);

  if (withImage.length === 0) return null;
  const following = Boolean(scope?.label && matched > 0);
  return <section id="dome-photos" className={`zr-container ${styles.strip}`} aria-labelledby="venue-photo-strip-title" data-photo-scope={following ? scope!.label! : undefined}>
    <div className={styles.head}>
      <Camera size={17} aria-hidden="true" />
      <h2 id="venue-photo-strip-title">{following ? <>{scope!.label}<small>の見え方 {matchedPhotos}枚</small></> : "席からの見え方"}</h2>
      <SeatPhotoPostLink venueId={venueId} venueName={venueName} section={scope?.section} placement="photo_row" variant="pill" />
      <OpenDetailsLink targetId={allTargetId} className={styles.all}>{count}枚<ChevronRight size={15} aria-hidden="true" /></OpenDetailsLink>
    </div>
    <ul ref={row} className={styles.row}>
      {ordered.slice(0, SHOWN).map((photo, index) => <li key={photo.href + photo.label} data-near={following && index < matched ? "" : undefined}>
        <a href={photo.href} className={styles.tile} aria-label={`${photo.label}からの見え方を見る`}>
          <Image src={photo.thumbnailUrl!} alt="" width={150} height={104} loading="lazy" unoptimized />
          <span>{photo.label}</span>
        </a>
      </li>)}
      <li><SeatPhotoPostLink venueId={venueId} venueName={venueName} section={scope?.section} placement="photo_row" variant="tile" /></li>
    </ul>
  </section>;
}
