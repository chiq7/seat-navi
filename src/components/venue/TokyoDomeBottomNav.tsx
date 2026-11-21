"use client";

import { useEffect, useRef, useState } from "react";
import { Armchair, Camera, CircleHelp, Ellipsis, Luggage, Map, Ticket, TrainFront, Utensils, X } from "lucide-react";
import { VenueProgramAnchor } from "./VenueProgramLinks";
import { OPEN_ARENA_MAPS_EVENT } from "./ArenaMapsSheet";
import styles from "./TokyoDomeBottomNav.module.css";

type Tab = "seats" | "photos" | "spots" | "access" | "more";

const MAIN: { tab: Exclude<Tab, "more">; id: string; label: string; Icon: typeof Armchair }[] = [
  { tab: "seats", id: "dome-seats", label: "座席", Icon: Armchair },
  { tab: "photos", id: "dome-photos", label: "写真", Icon: Camera },
  { tab: "spots", id: "dome-spots", label: "設備", Icon: Utensils },
  { tab: "access", id: "dome-access", label: "アクセス", Icon: TrainFront },
];

/** Page sections in any order; the last one whose top has passed the reading line decides the lit tab. */
const SECTION_TAB: [string, Tab][] = [
  ["dome-seats", "seats"], ["dome-photos", "photos"], ["dome-spots", "spots"], ["dome-access", "access"],
  ["dome-prepare", "more"], ["dome-faq", "more"], ["seat-photo-title", "photos"],
  ["upcoming-events-title", "more"], ["past-events-title", "more"],
];

/** Phone-only section bar fixed to the bottom of the Tokyo Dome page: four main sections and a "more" sheet. */
export default function TokyoDomeBottomNav() {
  const [active, setActive] = useState<Tab>("seats");
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Room below the page for the fixed bar (a body class instead of a body:has() rule, which re-checks the whole page on every change).
  useEffect(() => {
    document.body.classList.add("domeBottomBar");
    return () => document.body.classList.remove("domeBottomBar");
  }, []);

  useEffect(() => {
    // A thin reading line ~200px from the top: the section under it is lit. The browser reports crossings,
    // so nothing runs on each scroll frame. Sections land ~80–110px from the top after a jump.
    const line = Math.round(Math.min(window.innerHeight * 0.4, 200));
    const tabOf = new globalThis.Map<Element, Tab>(); // "Map" here is the icon import
    for (const [id, tab] of SECTION_TAB) {
      const element = document.getElementById(id);
      const block = element?.tagName === "H2" ? element.closest("section") ?? element : element;
      if (block) tabOf.set(block, tab);
    }
    const under = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) { if (entry.isIntersecting) under.add(entry.target); else under.delete(entry.target); }
      const hit = [...under].sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
      if (hit) setActive(tabOf.get(hit)!);
    }, { rootMargin: `-${line}px 0px -${Math.max(0, window.innerHeight - line - 1)}px 0px` });
    tabOf.forEach((_, block) => observer.observe(block));
    return () => observer.disconnect();
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
      <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new Event(OPEN_ARENA_MAPS_EVENT)); }}>{tile(Map, "アリーナ図")}</button>
      <VenueProgramAnchor fallbackHref="#upcoming-events-title">{tile(Ticket, "公演")}</VenueProgramAnchor>
      <a href="#dome-faq">{tile(CircleHelp, "質問")}</a>
    </div>}
    <div className={styles.bar}>
      {MAIN.map(({ tab, id, label, Icon }) => <a key={id} href={`#${id}`} data-active={active === tab || undefined}
        aria-current={active === tab ? "location" : undefined} onClick={() => { setOpen(false); setActive(tab); }}>
        <Icon size={20} aria-hidden="true" /><span>{label}</span>
      </a>)}
      <button type="button" data-active={active === "more" || open || undefined} aria-expanded={open} aria-controls="dome-more-sheet"
        onClick={() => setOpen(value => !value)}>
        {open ? <X size={20} aria-hidden="true" /> : <Ellipsis size={20} aria-hidden="true" />}<span>{open ? "閉じる" : "その他"}</span>
      </button>
    </div>
  </nav>;
}
