"use client";
import {useRef,useState,type ComponentType} from 'react';
import {DomeGuideHeader} from '../template/DomeGuideLayout';
import StandSeatMap,{type StandSeatMapHandle} from '../template/StandSeatMap';
import VenueFacilityFinder,{type FacilityFinderHandle} from '../template/VenueFacilityFinder';
import {resolveArenaSeatLink,resolveArenaView,type ArenaGuideDefinition} from './arenaDefinition';
import {useVenueSeatTarget} from '../VenueSeatTarget';
import styles from './KArenaGuide.module.css';
import VenueAccessCards from '../template/VenueAccessCards';
import InsidePhotos from './InsidePhotos';
import {AfterSeats,useGuidePageSlots} from './GuidePageSlots';
import {arenaAccessEntries} from '@/lib/venueAccess';
export default function ArenaGuideContent({definition,embedded=false,primeLocation:PrimeLocation}:{definition:ArenaGuideDefinition;embedded?:boolean;primeLocation?:ComponentType<{onRegion:(level:string,area:string)=>void}>}){
const venue=definition.venueId,data=definition.data,finder=useRef<FacilityFinderHandle>(null),facilities=useRef<HTMLElement>(null);
const target=useVenueSeatTarget(),{pageNav}=useGuidePageSlots();
const [{mode,section},setSeatView]=useState(()=>resolveArenaSeatLink(definition,target));
const primeMap=useRef<StandSeatMapHandle>(null),primeNumbers=useRef<HTMLDivElement>(null);
const isEdion=venue==='edion-arena',isPrime=mode===definition.primeMode;
const modeKey=mode,resolved=resolveArenaView(definition,mode),{guide,seats,levels,facilities:facilityConfig}=resolved;
  function revealFacilities() { facilities.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }
  function showEquipment(floor: string | null) { finder.current?.linkSeatFloor(floor); revealFacilities(); }
  function showLuggage() { finder.current?.showLuggage(); revealFacilities(); }
  function showNearby(purpose: "案内" | "飲食", query = "") { finder.current?.showNearby?.(purpose, query); revealFacilities(); }
  function showPrimeRegion(level: string, area: string) {
    primeMap.current?.showRegion(level, area);
    primeNumbers.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  return <div className={styles.guide}>
    <DomeGuideHeader name={data.guide.name} showHero={!embedded} showNav={!pageNav}/>
    <div className={`zr-container ${styles.content}`}>
      {isEdion && <aside className={styles.closure} aria-label="改修休館の案内"><strong>全館休館中</strong><p>{definition.closureNote}</p><a href="https://www.furitutaiikukaikan.ne.jp/" target="_blank" rel="noopener noreferrer">公式の休館・再開案内 ↗</a></aside>}
      <section id="venue-seats"><h2>{data.guide.name}の座席を探す</h2>
        {venue === "saitama-super-arena" && <aside className={styles.closure} aria-label="座席図と改修工事について"><strong>改修前の参考配置です</strong><p>メインアリーナなどは2027年3月末まで休館予定です。再開後の席は公演の案内をご確認ください。</p><a href="https://www.saitama-arena.co.jp/news/2026/03303374.html" target="_blank" rel="noopener noreferrer">公式の休館案内 ↗</a></aside>}
        {definition.modes && <div className={styles.modes} aria-label={definition.modes.ariaLabel}><span>{definition.modes.caption}</span>{definition.modes.options.map(value=><button key={value.id} type="button" aria-pressed={mode === value.id} onClick={()=>{ if (value.id !== mode) setSeatView({mode:value.id,section:null}); }}>{value.label}</button>)}</div>}
        {isPrime && PrimeLocation && <PrimeLocation onRegion={showPrimeRegion}/>}
        <div ref={primeNumbers}><StandSeatMap ref={isPrime ? primeMap : undefined} key={`${venue}-${modeKey}`} data={seats} levels={levels} areas={resolved.areas} initialSection={section} onEquipment={showEquipment} venueId={venue}/></div>
        {venue !== "saitama-super-arena" && <p className={styles.note}>{resolved.seatNote}</p>}
      </section>
      <AfterSeats nested/>
      <section id="venue-facilities" ref={facilities}><h2>必要な設備を探す</h2>{"facilityNote" in data && <p className={styles.note}>{data.facilityNote}</p>}<VenueFacilityFinder key={`${venue}-${definition.preserveFacilitiesAcrossModes ? "fixed" : modeKey}`} ref={finder} guide={guide} config={facilityConfig}/></section>
      {data.insidePhotos && <InsidePhotos data={data.insidePhotos}/>}
      <section id="venue-access"><h2>駅から{data.guide.name}へ</h2><VenueAccessCards venueId={venue} destination={data.guide.name} entries={arenaAccessEntries(guide,data.access,data.officialRouteUrl ?? data.accessUrl)}/><p className={styles.note}>{"accessNote" in data ? data.accessNote : isEdion ? "距離は会場の公式案内です。全館休館中のため再開・入場口は公式案内を確認してください。" : "徒歩時間は公式案内の目安です。当日の入場口は公演案内に従ってください。"}</p><a className={`${styles.linkButton} ${styles.accessLink}`} href={data.accessUrl} target="_blank" rel="noopener noreferrer">駅・入場の公式案内 ↗</a>
        {data.parking && <div className={`${styles.prep} ${styles.nearbyCards}`}>
          <article><h3>車・駐車場</h3><p>{data.parking.text}</p><button type="button" onClick={()=>showNearby("案内","駐車場")}>周辺の駐車場を見る ↑</button></article>
          {data.parking.meetup && <article><h3>公演前後の待ち合わせ</h3><p>{data.parking.meetup}</p><div className={styles.buttonRow}><button type="button" onClick={()=>showNearby("飲食","周辺のお店")}>周辺のお店を見る ↑</button>{data.parking.park && <button type="button" onClick={()=>showNearby("案内",data.parking!.park!)}>{data.parking.park}を見る ↑</button>}</div></article>}
        </div>}
      </section>
      <section id="venue-prep"><h2>出発前の準備</h2><div className={styles.prep}>
        <article><h3>大きな荷物</h3><p>{data.luggage}</p><button type="button" onClick={showLuggage}>ロッカー・荷物預かりを探す ↓</button></article>
        <article><h3>{data.preparationTitle}</h3><p>{data.preparation}</p></article>
      </div></section>
      {!embedded && <section id="upcoming-events-title"><h2>公演の案内</h2><a className={styles.linkButton} href={data.eventsUrl} target="_blank" rel="noopener noreferrer">{data.guide.name}の公演予定 ↗</a></section>}
      <section id="venue-faq"><h2>よくある質問</h2>{data.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    </div>
  </div>;
}
