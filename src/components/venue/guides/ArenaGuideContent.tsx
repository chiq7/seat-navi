"use client";
import {useRef,useState,type ComponentType} from 'react';
import {DomeGuideHeader} from '../template/DomeGuideLayout';
import StandSeatMap,{type StandSeatMapHandle} from '../template/StandSeatMap';
import VenueFacilityFinder,{type FacilityFinderHandle} from '../template/VenueFacilityFinder';
import {resolveArenaView,type ArenaGuideDefinition} from './arenaDefinition';
import styles from './KArenaGuide.module.css';
export default function ArenaGuideContent({definition,embedded=false,primeLocation:PrimeLocation}:{definition:ArenaGuideDefinition;embedded?:boolean;primeLocation?:ComponentType<{onRegion:(level:string,area:string)=>void}>}){
const venue=definition.venueId,data=definition.data,finder=useRef<FacilityFinderHandle>(null),facilities=useRef<HTMLElement>(null);
const [mode,setMode]=useState(definition.initialMode??'fixed');
const primeMap=useRef<StandSeatMapHandle>(null),primeNumbers=useRef<HTMLDivElement>(null);
const isEdion=venue==='edion-arena',isPrime=mode===definition.primeMode;
const modeKey=mode,resolved=resolveArenaView(definition,mode),{guide,seats,levels,facilities:facilityConfig}=resolved;
  function revealFacilities() { facilities.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }
  function showEquipment(floor: string | null) { finder.current?.linkSeatFloor(floor); revealFacilities(); }
  function showLuggage() { finder.current?.showLuggage(); revealFacilities(); }
  function showPrimeRegion(level: string, area: string) {
    primeMap.current?.showRegion(level, area);
    primeNumbers.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  return <div className={styles.guide}>
    <DomeGuideHeader name={data.guide.name} showHero={!embedded}/>
    <div className={`zr-container ${styles.content}`}>
      {isEdion && <aside className={styles.closure} aria-label="改修休館の案内"><strong>全館休館中</strong><p>{definition.closureNote}</p><a href="https://www.furitutaiikukaikan.ne.jp/" target="_blank" rel="noopener noreferrer">公式の休館・再開案内 ↗</a></aside>}
      <section id="venue-seats"><h2>{data.guide.name}の座席を探す</h2>
        {definition.modes && <div className={styles.modes} aria-label={definition.modes.ariaLabel}><span>{definition.modes.caption}</span>{definition.modes.options.map(value=><button key={value.id} type="button" aria-pressed={mode === value.id} onClick={()=>setMode(value.id)}>{value.label}</button>)}</div>}
        {isPrime && PrimeLocation && <PrimeLocation onRegion={showPrimeRegion}/>}
        <div ref={primeNumbers}><StandSeatMap ref={isPrime ? primeMap : undefined} key={`${venue}-${modeKey}`} data={seats} levels={levels} areas={resolved.areas} onEquipment={showEquipment}/></div>
        <p className={styles.note}>{resolved.seatNote}</p>
      </section>
      <section id="venue-facilities" ref={facilities}><h2>必要な設備を探す</h2>{"facilityNote" in data && <p className={styles.note}>{data.facilityNote}</p>}<VenueFacilityFinder key={`${venue}-${definition.preserveFacilitiesAcrossModes ? "fixed" : modeKey}`} ref={finder} guide={guide} config={facilityConfig}/></section>
      <section id="venue-access"><h2>駅から{data.guide.name}へ</h2><div className={styles.access}>
        {data.access.map(([name, exit, time]) => <article key={`${name}-${exit}`}><h3>{name}</h3><p>{exit}</p><strong>{time}</strong><a href={"officialRouteUrl" in data ? data.officialRouteUrl : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${name} ${exit}`)}&destination=${encodeURIComponent(data.guide.name)}&travelmode=walking`} target="_blank" rel="noopener noreferrer">{"routeLabel" in data ? data.routeLabel : "officialRouteUrl" in data ? "来場・帰りの指定ルート ↗" : "地図で道順を見る ↗"}</a></article>)}
      </div><p className={styles.note}>{"accessNote" in data ? data.accessNote : isEdion ? "距離は会場の公式案内です。全館休館中のため再開・入場口は公式案内を確認してください。" : "徒歩時間は公式案内の目安です。当日の入場口は公演案内に従ってください。"}<a href={data.accessUrl} target="_blank" rel="noopener noreferrer">駅・入場の案内 ↗</a></p></section>
      <section id="venue-prep"><h2>出発前の準備</h2><div className={styles.prep}>
        <article><h3>大きな荷物</h3><p>{data.luggage}</p><button type="button" onClick={showLuggage}>ロッカー・荷物預かりを探す ↓</button></article>
        <article><h3>{data.preparationTitle}</h3><p>{data.preparation}</p></article>
      </div></section>
      {!embedded && <section id="upcoming-events-title"><h2>公演の案内</h2><a className={styles.linkButton} href={data.eventsUrl} target="_blank" rel="noopener noreferrer">{data.guide.name}の公演予定 ↗</a></section>}
      <section id="venue-faq"><h2>よくある質問</h2>{data.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    </div>
  </div>;
}
