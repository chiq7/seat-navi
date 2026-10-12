"use client";
import { useRef } from "react";
import { DomeGuideHeader } from "../template/DomeGuideLayout";
import StandSeatMap from "../template/StandSeatMap";
import VenueFacilityFinder, { type FacilityFinderHandle } from "../template/VenueFacilityFinder";
import { kArenaGuide } from "@/data/venueGuides/k-arena";
import { kArenaAreas, kArenaFacilityConfig, kArenaLevels, kArenaStandSeats } from "@/data/venueGuides/k-arena/config";
import styles from "./KArenaGuide.module.css";

export default function KArenaGuide({ embedded=false }: { embedded?: boolean }) {
  const finder = useRef<FacilityFinderHandle>(null);
  const facilities = useRef<HTMLElement>(null);
  function revealFacilities() { facilities.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }
  function showEquipment(floor: string | null) { finder.current?.linkSeatFloor(floor); revealFacilities(); }
  function showLuggage() { finder.current?.showLuggage(); revealFacilities(); }
  return <div className={styles.guide}>
    <DomeGuideHeader name="Kアリーナ横浜" showHero={!embedded}/>
    <div className={`zr-container ${styles.content}`}>
      <section id="venue-seats"><h2>Kアリーナ横浜の座席を探す</h2>
        <StandSeatMap data={kArenaStandSeats} levels={kArenaLevels} areas={kArenaAreas} onEquipment={showEquipment}/>
        <p className={styles.note}>公演別のアリーナ配置は、主催者の座席案内をご確認ください。</p>
      </section>
      <section id="venue-facilities" ref={facilities}><h2>必要な設備を探す</h2>
        <VenueFacilityFinder ref={finder} guide={kArenaGuide} config={kArenaFacilityConfig}/>
      </section>
      <section id="venue-access"><h2>駅からKアリーナ横浜へ</h2>
        <div className={styles.access}>
          {[["横浜駅", "JR・各線／東口", "徒歩9分"], ["新高島駅", "みなとみらい線／4 臨港パーク口", "徒歩5分"], ["みなとみらい駅", "みなとみらい線／2 いちょう通り口", "徒歩12分"]].map(([name, exit, time]) => <article key={name}><h3>{name}</h3><p>{exit}</p><strong>{time}</strong><a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${name} ${exit.split("／")[1]}`)}&destination=${encodeURIComponent("Kアリーナ横浜")}&travelmode=walking`} target="_blank" rel="noopener noreferrer">地図で道順を見る ↗</a></article>)}
        </div>
        <p className={styles.note}>徒歩時間は公式案内の目安です。公演当日の入口・規制退場は現地案内に従ってください。<a href="https://k-arena.com/access/" target="_blank" rel="noopener noreferrer">入退場の案内 ↗</a></p>
      </section>
      <section id="venue-prep"><h2>出発前の準備</h2><div className={styles.prep}>
        <article><h3>大きな荷物</h3><p>館内ロッカーは小型。キャリーケースは屋外の大型ロッカーやK-Arena Shopの預かりを確認してください。</p><button type="button" onClick={showLuggage}>ロッカー・荷物預かりを探す ↓</button></article>
        <article><h3>支払い</h3><p>館内の売店・バーはキャッシュレス。コインロッカーは現金で利用します。</p></article>
      </div></section>
      {!embedded && <section id="upcoming-events-title"><h2>公演の案内</h2><a className={styles.linkButton} href="https://k-arena.com/schedule/" target="_blank" rel="noopener noreferrer">Kアリーナ横浜の公演予定 ↗</a></section>}
      <section id="venue-faq"><h2>よくある質問</h2>
        <details><summary>LEVELとは何ですか？</summary><p>施設の階数です。メインエントランスはLEVEL3にあります。</p></details>
        <details><summary>開場前にトイレを使えますか？</summary><p>ノースゲート階段下とサウスエントランス側の外周にあります。「場外・入場前」から探せます。</p></details>
        <details><summary>車いすで来場する場合は？</summary><p>エレベーター・スロープのあるサウスゲートへ。館内の案内は公演主催者に確認してください。</p></details>
      </section>
    </div>
  </div>;
}
