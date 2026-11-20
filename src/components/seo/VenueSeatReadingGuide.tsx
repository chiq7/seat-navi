import { venueSearchIntents } from "@/lib/venueSearchIntents";
import Image from "next/image";
import { getVenuePhotoIndex, type EventVenuePhotoPreview } from "@/lib/serverSeatPhotoVenues";
import styles from "./SearchContentGuides.module.css";

type Props = { venueId: string; name: string; photoPreview: EventVenuePhotoPreview | null };

export default function VenueSeatReadingGuide({ venueId, name, photoPreview }: Props) {
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
        <a className={`${styles.link} zr-focus`} href={seatSection}>{venueId === "toki-messe" ? "ホールの位置を見る" : "座席表を見る"}</a>
      </section>
      <section aria-labelledby="seat-photo-title" data-published-photos={photoPreview?.count ?? 0}>
        <details>
          <summary className="zr-focus"><h2 id="seat-photo-title" className="inline">{name}の座席からの見え方・写真一覧（{photoPreview?.count ?? 0}枚）</h2></summary>
          <p id="venue-photo-list" className="scroll-mt-20">{guide.detail}</p>
          {photoIndex.length === 0 ? <p>この会場の座席写真はまだありません。</p> : venueId === "toki-messe"
            ? <a href="#past-arena-photos" className={`${styles.link} zr-focus`}>公演日の配置図で写真を見る</a>
            : <p>カメラ印のある区画を選び、「写真を見る」を押すと、その場で見え方を確認できます。</p>}
          {previews.length > 0 && <ul className={styles.photoPreviews} aria-label="座席写真のプレビュー">
            {previews.map(photo => <li key={photo.thumbnailUrl}><a className="zr-focus" href={photo.href}>
              <Image src={photo.thumbnailUrl} alt={`${photo.label}からの見え方`} width={160} height={100} loading="lazy" unoptimized />
            </a></li>)}
          </ul>}
          {photoIndex.length > 0 && <>
            <h3 id="seat-photo-blocks-title">写真のある席・区画</h3>
            <ul id="seat-photo-inventory" className={styles.links} aria-labelledby="seat-photo-blocks-title">
              {photoIndex.map(photo => <li key={photo.href + photo.label}>
                <a href={photo.href} className={`${styles.link} zr-focus`}>{photo.label}（{photo.count}枚）</a>
              </li>)}
            </ul>
          </>}
        </details>
      </section>
    </div>
  );
}
