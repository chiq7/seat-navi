"use client";

import { useEffect, useRef, useState } from "react";
import { Armchair, Camera, CircleHelp, Ellipsis, Luggage, MessageSquareText, Ticket, TrainFront, Utensils, X } from "lucide-react";
import { VenueProgramAnchor } from "./VenueProgramLinks";
import styles from "./TokyoDomeBottomNav.module.css";

type Tab = "seats" | "photos" | "spots" | "access" | "more";

const MAIN: { tab: Exclude<Tab, "more">; id: string; label: string; Icon: typeof Armchair }[] = [
  { tab: "seats", id: "dome-seats", label: "座席", Icon: Armchair },
  { tab: "photos", id: "dome-photos", label: "写真", Icon: Camera },
  { tab: "spots", id: "dome-spots", label: "設備", Icon: Utensils },
  { tab: "access", id: "dome-access", label: "アクセス", Icon: TrainFront },
];

/** Page sections in any order; the last one whose top has passed 40% of the screen decides the lit tab. */
const SECTION_TAB: [string, Tab][] = [
  ["dome-seats", "seats"], ["dome-photos", "photos"], ["dome-spots", "spots"], ["dome-access", "access"],
  ["dome-prepare", "more"], ["dome-faq", "more"], ["seat-source-posts", "more"], ["seat-photo-title", "photos"],
  ["upcoming-events-title", "more"], ["past-events-title", "more"],
];

/** Phone-only section bar fixed to the bottom of the Tokyo Dome page: four main sections and a "more" sheet. */
export default function TokyoDomeBottomNav() {
  const [active, setActive] = useState<Tab>("seats");
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let best: { top: number; tab: Tab } | null = null;
      for (const [id, tab] of SECTION_TAB) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line && (!best || top > best.top)) best = { top, tab };
      }
      setActive(best?.tab ?? "seats");
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    const events = ["resize", "hashchange", "scrollend"];
    events.forEach(name => window.addEventListener(name, onScroll));
    return () => { window.removeEventListener("scroll", onScroll); events.forEach(name => window.removeEventListener(name, onScroll)); if (frame) cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !navRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, [open]);

  const tile = (Icon: typeof Armchair, label: string) => <><Icon size={24} aria-hidden="true" /><span>{label}</span></>;
  return <nav ref={navRef} className={styles.nav} aria-label="東京ドームガイドの目次" data-dome-bottom-nav>
    {open && <div id="dome-more-sheet" className={styles.sheet} onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
      <a href="#dome-prepare">{tile(Luggage, "持ち物")}</a>
      <a href="#seat-source-posts">{tile(MessageSquareText, "レポ")}</a>
      <VenueProgramAnchor fallbackHref="#upcoming-events-title">{tile(Ticket, "公演")}</VenueProgramAnchor>
      <a href="#dome-faq">{tile(CircleHelp, "質問")}</a>
    </div>}
    <div className={styles.bar}>
      {MAIN.map(({ tab, id, label, Icon }) => <a key={id} href={`#${id}`} data-active={active === tab || undefined}
        aria-current={active === tab ? "location" : undefined} onClick={() => { setOpen(false); setActive(tab); }}>
        <Icon size={22} aria-hidden="true" /><span>{label}</span>
      </a>)}
      <button type="button" data-active={active === "more" || open || undefined} aria-expanded={open} aria-controls="dome-more-sheet"
        onClick={() => setOpen(value => !value)}>
        {open ? <X size={22} aria-hidden="true" /> : <Ellipsis size={22} aria-hidden="true" />}<span>{open ? "閉じる" : "その他"}</span>
      </button>
    </div>
  </nav>;
}
