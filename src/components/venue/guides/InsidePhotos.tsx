import type { InsidePhotos as InsidePhotosData } from "./arenaDefinition";
import styles from "./InsidePhotos.module.css";

/** Photos taken inside the venue, one card per topic: the facts first, then a sideways row of photos. */
export default function InsidePhotos({ data }: { data: InsidePhotosData }) {
  return <section id="venue-inside-photos" className={styles.section}>
    <h2>{data.heading}</h2>
    <p className={styles.note}>{data.note}</p>
    <div className={styles.groups}>
      {data.groups.map(group => <article key={group.id} className={styles.group} aria-labelledby={`inside-${group.id}`}>
        <h3 id={`inside-${group.id}`}>{group.title}</h3>
        <p>{group.text}</p>
        <ul className={styles.row} aria-label={`${group.title}の写真`}>
          {group.photos.map(photo => <li key={photo.src}>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element -- small local WebP photos, sized in advance */}
              <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" />
              <figcaption>{photo.caption}</figcaption>
            </figure>
          </li>)}
        </ul>
      </article>)}
    </div>
  </section>;
}
