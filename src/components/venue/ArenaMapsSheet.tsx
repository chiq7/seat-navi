"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Ticket, X } from "lucide-react";
import styles from "./ArenaMapsSheet.module.css";

/** One X post that shows the arena layout of one show. */
export type ArenaMapPost = { id: string; url: string; date: string; title: string; eventId: string | null };

/** Fired by controls outside the seat map (the bottom bar) to open the sheet. */
export const OPEN_ARENA_MAPS_EVENT = "tixrepo:open-arena-maps";

const ArenaMapsContext = createContext<{ count: number; open: () => void } | null>(null);
/** Null where the page has no arena maps, so the map draws no arena button. */
export function useArenaMaps() { return useContext(ArenaMapsContext); }

const embedUrl = (id: string) => `https://platform.twitter.com/embed/Tweet.html?id=${id}&lang=ja&dnt=true&conversation=none`;
const shortDate = (date: string) => date.replace(/^(\d{4})\/0?(\d+)\/0?(\d+)$/, (_, y, m, d) => `${y.slice(2)}.${m}/${d}`);

/**
 * Holds the arena-layout posts of a venue and shows them in a bottom sheet, one show per page,
 * newest first. The seat map opens it from the arena; each page embeds the original X post.
 */
export function ArenaMapsProvider({ posts, children }: { posts: ArenaMapPost[]; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [index, setIndex] = useState(0);

  const open = useCallback(() => {
    if (!posts.length || dialog.current?.open) return;
    setIndex(0); setOpened(true);
    dialog.current?.showModal();
    pages.current?.scrollTo({ left: 0 });
  }, [posts.length]);
  const context = useMemo(() => posts.length ? { count: posts.length, open } : null, [posts.length, open]);

  useEffect(() => {
    window.addEventListener(OPEN_ARENA_MAPS_EVENT, open);
    return () => window.removeEventListener(OPEN_ARENA_MAPS_EVENT, open);
  }, [open]);

  function go(next: number) {
    const target = Math.max(0, Math.min(posts.length - 1, next));
    const strip = pages.current;
    if (strip) strip.scrollTo({ left: strip.clientWidth * target, behavior: "smooth" });
    setIndex(target);
  }
  function onScroll() {
    const strip = pages.current;
    if (!strip?.clientWidth) return;
    const current = Math.round(strip.scrollLeft / strip.clientWidth);
    if (current !== index) setIndex(current);
  }
  // Keep the chip of the show on screen in view.
  useEffect(() => {
    chips.current?.querySelector<HTMLElement>(`[data-chip="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index]);

  return <ArenaMapsContext value={context}>
    {children}
    {posts.length > 0 && <dialog ref={dialog} className={styles.sheet} aria-labelledby="arena-maps-title" data-arena-maps-sheet=""
      onClose={() => setOpened(false)} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className={styles.head}>
        <h2 id="arena-maps-title">アリーナ図<small>{index + 1} / {posts.length}</small></h2>
        <button type="button" className={styles.close} aria-label="アリーナ図を閉じる" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
      </div>
      <div ref={chips} className={styles.chips} role="group" aria-label="公演を選ぶ">
        {posts.map((post, i) => <button key={post.id} type="button" data-chip={i} aria-pressed={i === index} onClick={() => go(i)}>
          <b>{shortDate(post.date)}</b><span>{post.title}</span>
        </button>)}
      </div>
      <div ref={pages} className={styles.pages} onScroll={onScroll}>
        {posts.map((post, i) => <section key={post.id} className={styles.page} aria-label={`${post.date} ${post.title}のアリーナ図`}>
          {/* Only the page on screen and its neighbours load the embed. */}
          {opened && Math.abs(i - index) <= 1
            ? <iframe className={styles.embed} src={embedUrl(post.id)} title={`${post.date} ${post.title}のアリーナ図（Xの投稿）`} referrerPolicy="no-referrer" loading="lazy" />
            : <div className={styles.embed} aria-hidden="true" />}
          <div className={styles.actions}>
            {post.eventId && <Link href={`/events/${encodeURIComponent(post.eventId)}`} prefetch={false} className={styles.primary}><Ticket size={16} aria-hidden="true" />この公演を見る</Link>}
            <a href={post.url} target="_blank" rel="external noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />Xで開く</a>
          </div>
        </section>)}
      </div>
      <div className={styles.pager}>
        <button type="button" aria-label="新しい公演へ" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={22} aria-hidden="true" /></button>
        <p><b>{posts[index]?.date}</b><span>{posts[index]?.title}</span></p>
        <button type="button" aria-label="前の公演へ" disabled={index === posts.length - 1} onClick={() => go(index + 1)}><ChevronRight size={22} aria-hidden="true" /></button>
      </div>
    </dialog>}
  </ArenaMapsContext>;
}
