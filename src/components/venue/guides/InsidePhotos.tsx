"use client";
import { useRef, useState } from "react";
import type { InsidePhoto, InsidePhotos as InsidePhotosData } from "./arenaDefinition";
import styles from "./InsidePhotos.module.css";

/** Photos taken inside the venue, one card per topic: the facts first, then a sideways row of photos.
 *  A tap opens the photo at full width so maps and small print can be read. */
export default function InsidePhotos({ data }: { data: InsidePhotosData }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState<InsidePhoto | null>(null);
  function show(photo: InsidePhoto, button: HTMLButtonElement) {
    opener.current = button;
    setOpen(photo);
    dialog.current?.showModal();
  }
  function close() { dialog.current?.close(); }
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
              <button type="button" className={styles.zoom} aria-label={`${photo.caption}の写真を大きく見る`} onClick={event => show(photo, event.currentTarget)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- small local WebP photos, sized in advance */}
                <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" />
                <span className={styles.zoomBadge} aria-hidden="true">拡大</span>
              </button>
              <figcaption>{photo.caption}</figcaption>
            </figure>
          </li>)}
        </ul>
      </article>)}
    </div>
    <dialog ref={dialog} className={styles.viewer} aria-label={open?.caption ?? "写真"}
      onClose={() => { setOpen(null); opener.current?.focus(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      {open && <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- the same local photo at full size */}
        <img src={open.src} width={open.width} height={open.height} alt={open.alt} />
        <figcaption>{open.caption}</figcaption>
      </figure>}
      <button type="button" className={styles.close} onClick={close} autoFocus>閉じる</button>
    </dialog>
  </section>;
}
