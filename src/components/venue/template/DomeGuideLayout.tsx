import type { ReactNode } from "react";
import { Armchair, CircleHelp, Luggage, Ticket, TrainFront, Utensils } from "lucide-react";
import tokyo from "../TokyoDomeVisitorGuide.module.css";
import styles from "./DomeGuideLayout.module.css";

// Presentation slots reuse Tokyo's current layout without moving venue state,
// geometry, sources, or production-page dependencies into this component.
export function DomeGuideHeader({ name, anchors={}, showHero=true }: { name: string; anchors?:Record<string,string>; showHero?: boolean }) {
  const links = [
    { id: "venue-seats", label: "座席", Icon: Armchair },
    { id: "venue-facilities", label: "設備・売店", Icon: Utensils },
    { id: "venue-access", label: "アクセス", Icon: TrainFront },
    { id: "venue-prep", label: "持ち物", Icon: Luggage },
    { id: "upcoming-events-title", label: "公演", Icon: Ticket },
    { id: "venue-faq", label: "質問", Icon: CircleHelp },
  ];
  return <>
    {showHero && <section className="community-hero">
      <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
        <p className="community-eyebrow">VENUE LIVE GUIDE</p>
        <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]"><span className="text-[#ef4f87]">{name}</span>の座席表<span className="mt-1 block text-[20px] sm:text-[28px]">アクセス・会場ガイド</span></h1>
        <p className="mt-2 text-[13px] font-medium leading-6 text-[#6c5c66]">自分の席から、荷物の預け先・売店まで。ライブへ行く日の準備をここで。</p>
      </div>
    </section>}
    <nav className={`zr-container ${tokyo.jumpNav}`} aria-label="会場ガイドの目次">
      {links.map(({ id, label, Icon }) => <a key={id} href={`#${anchors[id]??id}`}><Icon size={26} aria-hidden="true" /><span>{label}</span></a>)}
    </nav>
  </>;
}

export function DomeFinderLayout({ map, results }: { map: ReactNode; results: ReactNode }) {
  return <div className={tokyo.finderBody} data-testid="dome-finder-layout">
    <div className={tokyo.mapAnchor} data-testid="dome-map-column">{map}</div>
    <div className={`${tokyo.resultsPanel} ${styles.results}`} data-testid="dome-results-column">{results}</div>
  </div>;
}
