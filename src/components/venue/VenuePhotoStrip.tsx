import Image from "next/image";
import { Camera, ChevronRight } from "lucide-react";
import type { EventVenuePhotoPreview } from "@/lib/serverSeatPhotoVenues";
import OpenDetailsLink from "./OpenDetailsLink";
import styles from "./VenuePhotoStrip.module.css";

/** Latest seat-view photos as one swipeable row, directly under the seat search. */
export default function VenuePhotoStrip({ preview, allTargetId }: { preview: EventVenuePhotoPreview | null; allTargetId: string }) {
  if (!preview || preview.photos.length === 0) return null;
  return <section id="dome-photos" className={`zr-container ${styles.strip}`} aria-labelledby="venue-photo-strip-title">
    <div className={styles.head}>
      <Camera size={17} aria-hidden="true" />
      <h2 id="venue-photo-strip-title">席からの見え方</h2>
      <OpenDetailsLink targetId={allTargetId} className={styles.all}>{preview.count}枚<ChevronRight size={15} aria-hidden="true" /></OpenDetailsLink>
    </div>
    <ul className={styles.row}>
      {preview.photos.map(photo => <li key={photo.thumbnailUrl}>
        <a href={photo.href} className={styles.tile} aria-label={`${photo.label}からの見え方を見る`}>
          <Image src={photo.thumbnailUrl} alt="" width={150} height={104} loading="lazy" unoptimized />
          <span>{photo.label}</span>
        </a>
      </li>)}
    </ul>
  </section>;
}
