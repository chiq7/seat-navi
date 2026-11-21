import { venueSearchIntents } from "@/lib/venueSearchIntents";
import Image from "next/image";
import { Camera, ChevronDown } from "lucide-react";
import { getVenuePhotoCovers, getVenuePhotoIndex, type EventVenuePhotoPreview } from "@/lib/serverSeatPhotoVenues";
import styles from "./SearchContentGuides.module.css";

/** Covers ordered by block code (A01…E22) with the code and row split out for a short tile label. */
function sortedCovers(venueId: string) {
  return getVenuePhotoCovers(venueId).map(photo => {
    const match = photo.label.match(/([A-Z]\d{1,3})(?:区画)?・(.+)$/);
    return { ...photo, code: match?.[1] ?? null, row: match?.[2] ?? "" };
  }).sort((a, b) => (a.code ?? "~").localeCompare(b.code ?? "~", "ja", { numeric: true })
    || (parseInt(a.row) || 0) - (parseInt(b.row) || 0));
}

type Props ={ venueId: string; name: string; photoPreview: EventVenuePhotoPreview | null; photosOpen?: boolean; gallery?: boolean };

export default function VenueSeatReadingGuide({ venueId, name, photoPreview, photosOpen = false, gallery = false }: Props) {
  const guide = venueSearchIntents[venueId];
  if (!guide) return null;
  const seatSection = venueId === "tokyo-dome" ? "#dome-seats" : "#venue-seats";
  const photoIndex = getVenuePhotoIndex(venueId);
  const previews = venueId === "tokyo-dome" ? [] : photoPreview?.photos ?? [];
  return (
    <div className={`zr-container ${styles.seatReading}`}>
      <section aria-labelledby="seat-reading-title">
        <h2 id="seat-reading-title">{name}のアリーナ・スタンド座席表と座席番号の見方</h2>
        <h3>{guide.focus}</h3>
        <p>{guide.lead}</p>
        {/* The gallery page (Tokyo Dome) has the map at the top and a 座席 tab in the bottom bar: no text link back. */}
        {!gallery && <a className={`${styles.link} zr-focus`} href={seatSection}>{venueId === "toki-messe" ? "ホールの位置を見る" : "座席表を見る"}</a>}
      </section>
      <section aria-labelledby="seat-photo-title" data-published-photos={photoPreview?.count ?? 0}>
        <details open={photosOpen}>
          {gallery
            ? <summary className={`zr-focus ${styles.galleryToggle}`}><Camera size={20} aria-hidden="true" />
              <h2 id="seat-photo-title">{name}の座席からの見え方・写真一覧<b>{photoPreview?.count ?? 0}枚</b></h2>
              <ChevronDown size={18} aria-hidden="true" /></summary>
            : <summary className="zr-focus"><h2 id="seat-photo-title" className="inline">{name}の座席からの見え方・写真一覧（{photoPreview?.count ?? 0}枚）</h2></summary>}
          <p id="venue-photo-list" className="scroll-mt-20">{guide.detail}</p>
          {photoIndex.length === 0 ? <p>この会場の座席写真はまだありません。</p> : venueId === "toki-messe"
            ? <a href="#past-arena-photos" className={`${styles.link} zr-focus`}>公演日の配置図で写真を見る</a>
            : gallery ? null : <p>カメラ印のある区画を選び、「写真を見る」を押すと、その場で見え方を確認できます。</p>}
          {previews.length > 0 && <ul className={styles.photoPreviews} aria-label="座席写真のプレビュー">
            {previews.map(photo => <li key={photo.thumbnailUrl}><a className="zr-focus" href={photo.href}>
              <Image src={photo.thumbnailUrl} alt={`${photo.label}からの見え方`} width={160} height={100} loading="lazy" unoptimized />
            </a></li>)}
          </ul>}
          {photoIndex.length > 0 && <>
            <h3 id="seat-photo-blocks-title">写真のある席・区画</h3>
            {gallery
              ? <ul id="seat-photo-inventory" className={styles.photoGrid} aria-labelledby="seat-photo-blocks-title">
                {sortedCovers(venueId).map(photo => <li key={photo.href + photo.label}>
                  <a href={photo.href} className="zr-focus" aria-label={`${photo.label}からの見え方（${photo.count}枚）`}>
                    {photo.thumbnailUrl
                      ? <Image src={photo.thumbnailUrl} alt="" width={120} height={90} loading="lazy" unoptimized />
                      : <span className={styles.photoGridEmpty}><Camera size={20} aria-hidden="true" /></span>}
                    <span className={styles.photoGridLabel}>{photo.code ? <><strong>{photo.code}</strong>{photo.row}</> : photo.label}</span>
                    {photo.count > 1 && <b>{photo.count}</b>}
                  </a>
                </li>)}
              </ul>
              : <ul id="seat-photo-inventory" className={styles.links} aria-labelledby="seat-photo-blocks-title">
                {photoIndex.map(photo => <li key={photo.href + photo.label}>
                  <a href={photo.href} className={`${styles.link} zr-focus`}>{photo.label}（{photo.count}枚）</a>
                </li>)}
              </ul>}
          </>}
        </details>
      </section>
    </div>
  );
}
