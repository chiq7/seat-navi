"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import styles from "./ArenaMapsSheet.module.css";

/** One X post that shows the arena layout of one show, with its photo when known. */
export type ArenaMapPost = {
  id: string; url: string; date: string; title: string; eventId: string | null;
  image: { src: string; width: number; height: number; user: string } | null;
};

/** Fired by controls outside the seat map (the bottom bar) to open the sheet. */
export const OPEN_ARENA_MAPS_EVENT = "tixrepo:open-arena-maps";

const ArenaMapsContext = createContext<{ count: number; open: () => void } | null>(null);
/** Null where the page has no arena maps, so the map draws no arena button. */
export function useArenaMaps() { return useContext(ArenaMapsContext); }

const embedUrl = (id: string) => `https://platform.twitter.com/embed/Tweet.html?id=${id}&lang=ja&dnt=true&conversation=none`;
const shortDate = (date: string) => date.replace(/^(\d{4})\/0?(\d+)\/0?(\d+)$/, (_, y, m, d) => `${y.slice(2)}.${m}/${d}`);

/**
 * Holds the arena-layout posts of a venue and shows them in a bottom sheet, one show per page,
 * newest first. Each page shows the post's photo in the middle (from X, not re-hosted); posts
 * without a known photo fall back to X's embed.
 */
export function ArenaMapsProvider({ posts, children }: { posts: ArenaMapPost[]; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  // While a tap-driven scroll glides to its page, the pages it passes must not move the chips.
  const target = useRef<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0, 1]));

  const open = useCallback(() => {
    if (!posts.length || dialog.current?.open) return;
    setIndex(0); setOpened(true); target.current = null;
    dialog.current?.showModal();
    pages.current?.scrollTo({ left: 0 });
    chips.current?.scrollTo({ left: 0 });
  }, [posts.length]);
  const context = useMemo(() => posts.length ? { count: posts.length, open } : null, [posts.length, open]);

  useEffect(() => {
    window.addEventListener(OPEN_ARENA_MAPS_EVENT, open);
    return () => window.removeEventListener(OPEN_ARENA_MAPS_EVENT, open);
  }, [open]);

  // Load the page on screen and its neighbours; keep anything already loaded.
  useEffect(() => {
    setSeen(current => current.has(index - 1) && current.has(index) && current.has(index + 1) ? current : new Set([...current, index - 1, index, index + 1]));
    const row = chips.current;
    const chip = row?.querySelector<HTMLElement>(`[data-chip="${index}"]`);
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }, [index]);

  function go(next: number) {
    const page = Math.max(0, Math.min(posts.length - 1, next));
    const strip = pages.current;
    target.current = page;
    setIndex(page);
    if (strip) strip.scrollTo({ left: strip.clientWidth * page, behavior: "smooth" });
  }
  function onScroll() {
    const strip = pages.current;
    if (!strip?.clientWidth) return;
    const current = Math.round(strip.scrollLeft / strip.clientWidth);
    if (target.current !== null) { if (current === target.current) target.current = null; return; }
    if (current !== index) setIndex(current);
  }

  const post = posts[index];
  return <ArenaMapsContext value={context}>
    {children}
    {posts.length > 0 && <dialog ref={dialog} className={styles.sheet} aria-labelledby="arena-maps-title" data-arena-maps-sheet=""
      onClose={() => setOpened(false)} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className={styles.head}>
        <h2 id="arena-maps-title">アリーナ図<small>{index + 1} / {posts.length}</small></h2>
        {post && <a className={styles.xLink} href={post.url} target="_blank" rel="external noopener noreferrer" aria-label="この投稿をXで開く（新しいタブ）">
          {post.image && <span>@{post.image.user}</span>}<ExternalLink size={14} aria-hidden="true" />
        </a>}
        <button type="button" className={styles.close} aria-label="アリーナ図を閉じる" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
      </div>
      <div ref={chips} className={styles.chips} role="group" aria-label="公演を選ぶ">
        {posts.map((item, i) => <button key={item.id} type="button" data-chip={i} aria-pressed={i === index} onClick={() => go(i)}>
          <b>{shortDate(item.date)}</b><span>{item.title}</span>
        </button>)}
      </div>
      <div ref={pages} className={styles.pages} onScroll={onScroll}>
        {posts.map((item, i) => <section key={item.id} className={styles.page} aria-label={`${item.date} ${item.title}のアリーナ図`}>
          {!opened || !seen.has(i) ? <div className={styles.placeholder} aria-hidden="true" />
            : item.image
              // eslint-disable-next-line @next/next/no-img-element -- the exact image from X, shown as posted
              ? <img className={styles.photo} src={item.image.src} width={item.image.width} height={item.image.height}
                alt={`${item.date} ${item.title}のアリーナ座席図（@${item.image.user}さんの投稿）`} decoding="async" referrerPolicy="no-referrer" />
              : <iframe className={styles.embed} src={embedUrl(item.id)} title={`${item.date} ${item.title}のアリーナ図（Xの投稿）`} referrerPolicy="no-referrer" loading="lazy" />}
        </section>)}
      </div>
      <div className={styles.pager}>
        <button type="button" aria-label="新しい公演へ" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={22} aria-hidden="true" /></button>
        {post?.eventId
          ? <Link className={styles.current} href={`/events/${encodeURIComponent(post.eventId)}`} prefetch={false}>
            <b>{post.date}</b><span>{post.title}</span><small>この公演を見る ›</small></Link>
          : <p className={styles.current}><b>{post?.date}</b><span>{post?.title}</span></p>}
        <button type="button" aria-label="前の公演へ" disabled={index === posts.length - 1} onClick={() => go(index + 1)}><ChevronRight size={22} aria-hidden="true" /></button>
      </div>
    </dialog>}
  </ArenaMapsContext>;
}
