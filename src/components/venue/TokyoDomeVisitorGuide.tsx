import { VenueProgramAnchor } from "@/components/venue/VenueProgramLinks";
import { ArrowRight, ArrowUpRight, Camera, CreditCard, Luggage, Ticket, TrainFront, Armchair, CircleHelp, Utensils, Accessibility, DoorOpen, Smartphone } from "lucide-react";
import { DOME_GUIDE_FAQ, DOME_GUIDE_SOURCES as sources, DOME_STATIONS, DOME_GUIDE_CHECKED_AT } from "@/data/tokyoDomeVisitorGuide";
import LazyFacilityFinder from "./LazyFacilityFinder";
import { tokyoDomeAccessStation, TOKYO_DOME_STATION_WALKING, TOKYO_DOME_ACCESS_EVENT } from "@/lib/tokyoDomeAccess";
import VenueAccessCards from "./template/VenueAccessCards";
import VenueLuggageLink from "./template/VenueLuggageLink";
import TokyoDomeBottomNav from "./TokyoDomeBottomNav";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { guideSectionIds } from "@/lib/venueGuideSections";
import styles from "./TokyoDomeVisitorGuide.module.css";

/** The venue page's section nav (chips on top, a fixed bar on phones), for any venue with a guide. */
export function TokyoDomeGuideNav({ venueId = "tokyo-dome", name = "東京ドーム" }: { venueId?: string; name?: string }) {
  const ids = guideSectionIds(venueId);
  const links = [
    { id: ids.seats, label: "座席", icon: Armchair }, { id: ids.photos, label: "写真", icon: Camera }, { id: ids.spots, label: "設備・売店", icon: Utensils },
    { id: ids.access, label: "アクセス", icon: TrainFront }, { id: ids.prepare, label: "持ち物", icon: Luggage },
    { id: "upcoming-events-title", label: "公演", icon: Ticket }, { id: ids.faq, label: "質問", icon: CircleHelp },
  ];
  return <><TokyoDomeBottomNav ids={ids} name={name} /><nav className={`zr-container ${styles.chipNav}`} aria-label={`${name}ガイドの目次`}>
    {links.map(({ id, label, icon: Icon }) => {
        const content = <><Icon size={16} aria-hidden="true" /><span>{label}</span></>;
        const href = `#${id}`;
        return id === "upcoming-events-title"
          ? <VenueProgramAnchor key={id} fallbackHref={href}>{content}</VenueProgramAnchor>
          : <a key={id} href={href}>{content}</a>;
      })}
  </nav></>;
}

export function TokyoDomeVisitorGuide() {
  // The page's "とは" section shows no sources; its facts are dated here with the rest.
  const profile = getVenueSeoProfile("tokyo-dome");
  return <div className={`zr-container ${styles.guide}`}>
    <section id="dome-spots" aria-labelledby="dome-spots-title" className={styles.section}>
      <h2 id="dome-spots-title">必要な設備を探す</h2>
      <div className={styles.finderScope}><LazyFacilityFinder /></div>
    </section>

    <section id="dome-access" aria-labelledby="dome-access-title" className={styles.section}>
      <h2 id="dome-access-title"><TrainFront aria-hidden="true" />駅から東京ドームへ</h2>
      <VenueAccessCards venueId="tokyo-dome" destination="東京ドーム" eventName={TOKYO_DOME_ACCESS_EVENT} entries={DOME_STATIONS.flatMap(station => station.exit.split("・").map(exit => ({ ...station, exit }))).map((station,index)=>({id:`tokyo-${index}`,from:station.name,exit:station.exit,line:station.line.replace("中央・総武線（各駅停車）","中央・総武線").replace("東京メトロ",""),time:TOKYO_DOME_STATION_WALKING.label,sourceUrl:sources.access.url,targetId:tokyoDomeAccessStation(station.line,station.exit)!.id}))}/>
      <div className={styles.twoActions}><a href="#dome-seats"><DoorOpen aria-hidden="true" /><span>入場ゲート<small>座席図でGATEの位置を見る</small></span><ArrowRight size={16} aria-hidden="true" /></a><a href={sources.barrierfreeRoute.url} target="_blank" rel="noopener noreferrer"><Accessibility aria-hidden="true" /><span>段差のないルート<small>水道橋駅西口はEVなし</small></span><ArrowUpRight size={16} aria-hidden="true" /></a></div>
      <details className={styles.explanation}><summary>アクセスの補足</summary>{DOME_STATIONS.map((station) => <p key={station.line}><strong>{station.line} {station.name}：</strong>{station.note}</p>)}<p>東京都文京区後楽1-3-61。出口の対応図です。実際の道順は地図・公式ルートで確認できます。</p></details>
    </section>

    <section id="dome-prepare" aria-labelledby="dome-prepare-title" className={styles.section}>
      <h2 id="dome-prepare-title"><Luggage aria-hidden="true" />出発前に、この3つ</h2>
      <div className={styles.prepareTiles}>
        <a href={sources.payment.url} target="_blank" rel="noopener noreferrer"><span className={styles.bigPictogram} aria-hidden="true"><CreditCard size={42} /><Smartphone size={29} /></span><strong>現金 ×</strong><span>カード・スマホ決済</span><small>場内</small></a>
        <VenueLuggageLink href="#dome-spots"><span className={styles.bigPictogram} aria-hidden="true"><Luggage size={45} /><ArrowRight size={22} /></span><strong>荷物</strong><span>ロッカー・預け先を探す</span><small>場内・周辺</small></VenueLuggageLink>
        <VenueProgramAnchor><span className={styles.bigPictogram} aria-hidden="true"><Ticket size={48} /></span><strong>チケット</strong><span>時刻・ゲート</span><small>公演の案内へ</small></VenueProgramAnchor>
      </div>
    </section>

    <section id="dome-faq" aria-labelledby="dome-faq-title" className={styles.section}>
      <h2 id="dome-faq-title"><CircleHelp aria-hidden="true" />気になることだけ</h2>
      <div className={styles.faq}>{DOME_GUIDE_FAQ.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
      <details className={styles.explanation}><summary>情報元・確認日</summary><p>{DOME_GUIDE_CHECKED_AT} 確認。設備の位置は公式フロア図・バリアフリー案内をもとに表示しています（一部は側・エリアのみ）。公演時の利用・通行は場内の案内に従ってください。</p><ul>{Object.values(sources).filter((source, index, all) => all.findIndex(other => other.url === source.url) === index).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul><p>施設概要（収容人数・開業日など）の確認日：{profile?.updatedAt}。駅からの徒歩時間は公式PDF（{TOKYO_DOME_STATION_WALKING.sourceVersion}版、現在は公開終了）によります。</p></details>
    </section>
  </div>;
}
