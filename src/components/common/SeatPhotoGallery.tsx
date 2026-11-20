"use client";

import { useId, useRef, useState } from "react";
import { SeatPhotoCreditLine } from "./SeatPhotoCreditLine";
import { seatPhotoCaption } from "@/lib/seatPhotoCaption";
import styles from "@/components/venue/template/SeatViewPosts.module.css";
import type { ScopedSeatPhoto } from "@/lib/serverSeatPhotoVenues";

export function SeatPhotoGallery({ photos }: { photos: ScopedSeatPhoto[] }) {
  const [selected, setSelected] = useState<ScopedSeatPhoto | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  function grid(items: ScopedSeatPhoto[]) {
    return <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(photo => <li key={photo.image}>
        <button type="button" aria-haspopup="dialog" data-gallery-photo className="zr-focus w-full rounded-xl text-left" onClick={() => {
          setFailed(false);
          setLoaded(false);
          setSelected(photo);
          dialog.current?.showModal();
        }}>
          {/* Direct, reviewed source image. The small variant is used in the list. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.thumbnail} alt="" width={240} height={150} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="aspect-[8/5] w-full rounded-lg bg-[#f4ecf1] object-cover" />
          <span className="mt-1 block text-xs font-bold">{photo.venue}</span>
          <span className="block text-xs text-[#695862]">{photo.label}</span>
          <span className="block break-words text-xs text-[#695862]">{seatPhotoCaption(photo.event, photo.seatVerified)}</span>
        </button>
      </li>)}
    </ul>;
  }

  return <>
    {grid(photos.slice(0, 4))}
    {photos.length > 4 && <details className="mt-2">
      <summary className="zr-focus cursor-pointer py-3 text-sm font-bold text-[#a41c53]">ほかの{photos.length - 4}枚を見る</summary>
      {grid(photos.slice(4))}
    </details>}
    <dialog ref={dialog} aria-labelledby={titleId} data-gallery-dialog onClose={() => setSelected(null)}
      onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[min(92vw,640px)] overflow-auto rounded-2xl border-0 bg-white p-0 text-[#453640] backdrop:bg-black/55">
      <div className="p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 id={titleId} className="font-bold">{selected?.venue} {selected?.label}</h3>
          <button type="button" className="zr-focus min-h-11 min-w-11 shrink-0 text-lg" aria-label="写真を閉じる" onClick={() => dialog.current?.close()}>×</button>
        </div>
        {selected && <>
          <SeatPhotoCreditLine key={selected.image} event={selected.event} verified={selected.seatVerified} />
          {failed ? <p role="status" className="py-4 text-sm">写真を読み込めませんでした。<button type="button" className="zr-focus min-h-11 underline" onClick={() => setFailed(false)}>再読み込み</button></p> :
            <div className={styles.imageFrame} aria-busy={!loaded}>
              {!loaded && <span className={styles.loading} role="status" data-photo-loading>写真を読み込み中…</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.image} alt={`${selected.venue} ${selected.label}からの見え方`} referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="mx-auto max-h-[54dvh] max-w-full rounded-lg object-contain" />
            </div>}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
            <a href={selected.href} className="zr-focus inline-flex min-h-11 items-center text-sm font-bold text-[#a41c53] underline">座席図を見る</a>
            {selected.source && <a href={selected.source} target="_blank" rel="noopener noreferrer" className="zr-focus inline-flex min-h-11 items-center text-xs underline">{selected.source.startsWith("https://x.com/") ? "元のX投稿を見る" : "写真の出典を見る"}</a>}
          </div>
        </>}
      </div>
    </dialog>
  </>;
}
