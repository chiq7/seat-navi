"use client";

import Link from "next/link";
import { ChevronRight, Map as MapIcon, Plus } from "lucide-react";
import { shortDate, useArenaMaps } from "./ArenaMapsSheet";
import styles from "./VenuePhotoStrip.module.css";

const thumbnail = (src: string) => src.replace(/([?&]name=)\w+/, "$1small");

/**
 * Past shows' arena layouts as one swipeable row right under the seat map (above the seat photos), newest first.
 * A tap opens the arena-map sheet on that show. Images are the posts' own images on X, loaded only near the screen.
 */
export default function ArenaMapStrip({ reportHref }: { reportHref?: string }) {
  const arenaMaps = useArenaMaps();
  if (!arenaMaps) return null;
  const { posts, count, open } = arenaMaps;
  return <section id="dome-arena-maps" className={`zr-container ${styles.strip}`} aria-labelledby="venue-arena-strip-title">
    <div className={styles.head}>
      <MapIcon size={17} aria-hidden="true" />
      <h2 id="venue-arena-strip-title">過去公演のアリーナ図</h2>
      <button type="button" className={styles.all} onClick={() => open(0)} aria-label={`アリーナ図を見る（${count}公演）`}>{count}公演<ChevronRight size={15} aria-hidden="true" /></button>
    </div>
    <ul className={styles.row}>
      {posts.map((post, index) => <li key={post.id}>
        <button type="button" className={`${styles.tile} ${styles.arenaTile}`} onClick={() => open(index)} aria-label={`${post.date} ${post.title}のアリーナ図を見る`}>
          {post.image
            // eslint-disable-next-line @next/next/no-img-element -- the post's own image on X, shown as posted
            ? <img src={thumbnail(post.image.src)} alt="" width={150} height={104} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            : <i aria-hidden="true"><MapIcon size={28} /></i>}
          <span><b>{shortDate(post.date)}</b>{post.title}</span>
        </button>
      </li>)}
      {/* The way in for people who were there: their show's arena map or seat photo. */}
      {reportHref && <li><Link href={reportHref} prefetch={false} className={`${styles.tile} ${styles.arenaTile} ${styles.postTile}`}>
        <i aria-hidden="true"><Plus size={28} /></i>
        <span><b>投稿する</b>あなたの公演のアリーナ図・座席写真</span>
      </Link></li>}
    </ul>
  </section>;
}
