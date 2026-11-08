"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Camera, ExternalLink, X } from "lucide-react";
import { seatViewMatch, type SeatViewPost, type SeatViewSelection } from "@/lib/seatViewPosts";
import styles from "./SeatViewPosts.module.css";

export type SeatViewMatch = { post: SeatViewPost; label: NonNullable<ReturnType<typeof seatViewMatch>> };

export function SeatViewNotice({ posts, selection }: {
  posts: readonly SeatViewPost[];
  selection: SeatViewSelection;
}) {
  const places = [...new Map(posts.map(post => [placeKey(post), post])).values()];
  const labelCounts = new Map<string, number>();
  for (const post of places) {
    const label = placeLabel(post);
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  function placeButton(post: SeatViewPost) {
    const label = placeLabel(post);
    return <button type="button" key={placeKey(post)} data-seat-view-place={placeKey(post)}
      onClick={() => selection.onSelect(post.place)} aria-haspopup="dialog" aria-pressed={Boolean(seatViewMatch(post, selection))}>
      {label}{(labelCounts.get(label) ?? 0) > 1 && post.seat && " " + post.seat + "番"}
    </button>;
  }

  const firstPlaces = places.slice(0, 6);
  const morePlaces = places.slice(firstPlaces.length);
  return <div className={styles.notice} aria-label="座席からの見え方の使い方">
    <p><Camera size={18} aria-hidden="true" /><span>座席からの見え方</span><small>{places.length}か所</small></p>
    <div className={styles.instruction}>地図や下の一覧で区画を選ぶと、写真が見られます。</div>
    <div className={styles.places}>{firstPlaces.map(placeButton)}</div>
    {morePlaces.length > 0 && <details className={styles.morePlaces}>
      <summary>ほかの{morePlaces.length}か所を見る</summary>
      <div className={styles.places}>{morePlaces.map(placeButton)}</div>
    </details>}
  </div>;
}

function placeKey(post: SeatViewPost) {
  return post.place.kind + ":" + post.place.id;
}

function placeLabel(post: SeatViewPost) {
  return post.area + (post.place.kind === "section" && post.row ? " " + post.row + "列" : "");
}

type EmbedWindow = Window & { twttr?: { widgets?: {
  createTweet: (id: string, element: HTMLElement, options: Record<string, string | boolean>) => Promise<HTMLElement | undefined>;
} } };

function XPost({ post }: { post: SeatViewPost }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => setState(current => current === "loading" ? "unavailable" : current), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  function showPost() {
    const mount = host.current;
    const id = new URL(post.url).pathname.match(/\/status\/(\d+)$/)?.[1];
    const widgets = (window as EmbedWindow).twttr?.widgets;
    if (!mount || mount.childElementCount) return;
    if (!id || !widgets) { setState("unavailable"); return; }
    const target = document.createElement("div");
    mount.append(target);
    void widgets.createTweet(id, target, { lang: "ja", conversation: "none", dnt: true })
      .then(element => {
        if (target.isConnected) setState(element ? "ready" : "unavailable");
      })
      .catch(() => { if (target.isConnected) setState("unavailable"); });
  }

  return <div className={styles.embed} data-x-embed-state={state}>
    <Script src="https://platform.twitter.com/widgets.js" strategy="afterInteractive"
      onReady={showPost} onError={() => setState("unavailable")} />
    <div ref={host} />
    {state !== "ready" && <p role="status" className={styles.status}>{state === "loading"
      ? "Xの投稿を読み込んでいます。"
      : "ここではXの投稿を表示できませんでした。"}</p>}
    <a className={styles.original} href={post.url} target="_blank" rel="noopener noreferrer">
      Xで元の投稿を開く <ExternalLink size={15} aria-hidden="true" />
    </a>
  </div>;
}

export function SeatViewDialog({ matches, panelId, onClose }: { matches: SeatViewMatch[]; panelId: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { post, label } = matches[index] ?? matches[0];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true });
    };
  }, []);

  function changePost(next: number) {
    setIndex(next);
    if (panel.current) panel.current.scrollTop = 0;
  }

  return <dialog ref={dialog} id={panelId} className={styles.dialog} aria-labelledby={`${panelId}-title`}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <header className={styles.dialogHeader}>
      <h3 id={`${panelId}-title`}><Camera size={18} aria-hidden="true" />見え方の投稿</h3>
      <button type="button" onClick={onClose} autoFocus>座席表に戻る<X size={18} aria-hidden="true" /></button>
    </header>
    <div ref={panel} className={styles.panel}>
    <p className={styles.context}><strong>{post.area}{post.row && `・${post.row}列`}{post.seat && `・${post.seat}番`}</strong>
      <span>{label}</span></p>
    {post.event && <p className={styles.note}>{post.event}</p>}
    {post.photo && <p className={styles.photoNumber}>この撮影位置は投稿の{post.photo}枚目です。</p>}
    <p className={styles.note}>過去の投稿です。ステージや機材の位置は公演によって変わります。</p>
    {matches.length > 1 && <div className={styles.pager} aria-label="見え方の投稿を切り替える">
      <button type="button" disabled={index === 0} onClick={() => changePost(index - 1)}>前の投稿</button>
      <span>{index + 1} / {matches.length}</span>
      <button type="button" disabled={index === matches.length - 1} onClick={() => changePost(index + 1)}>次の投稿</button>
    </div>}
    <XPost key={post.url} post={post} />
    </div>
  </dialog>;
}
