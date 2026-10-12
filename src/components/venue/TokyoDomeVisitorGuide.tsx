import { ArrowRight, ArrowUpRight, CreditCard, Luggage, MapPin, Ticket, TrainFront, Armchair, CircleHelp, Utensils, Accessibility, DoorOpen, Smartphone } from "lucide-react";
import { DOME_GUIDE_FAQ, DOME_GUIDE_SOURCES as sources, DOME_STATIONS, DOME_GUIDE_CHECKED_AT } from "@/data/tokyoDomeVisitorGuide";
import { TokyoDomeGuideFinder } from "./TokyoDomeGuideFinder";
import { tokyoDomeAccessStation, TOKYO_DOME_STATION_WALKING } from "@/lib/tokyoDomeAccess";
import TokyoDomeStationLink from "./TokyoDomeStationLink";
import VenueLuggageLink from "./template/VenueLuggageLink";
import styles from "./TokyoDomeVisitorGuide.module.css";

export function TokyoDomeGuideNav() {
  const links = [
    { id: "dome-seats", label: "座席", icon: Armchair }, { id: "dome-spots", label: "設備・売店", icon: Utensils },
    { id: "dome-access", label: "アクセス", icon: TrainFront }, { id: "dome-prepare", label: "持ち物", icon: Luggage },
    { id: "upcoming-events-title", label: "公演", icon: Ticket }, { id: "dome-faq", label: "質問", icon: CircleHelp },
  ];
  return <nav className={`zr-container ${styles.jumpNav}`} aria-label="東京ドームガイドの目次">
    {links.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`}><Icon size={26} aria-hidden="true" /><span>{label}</span></a>)}
  </nav>;
}

function DomeDrawing() {
  return <svg viewBox="0 0 280 126" className={styles.domeDrawing} aria-hidden="true">
    <ellipse cx="140" cy="111" rx="126" ry="10" fill="#f2e6ed" />
    <path d="M25 76Q36 18 140 16Q244 18 255 76L250 108H30Z" fill="#fff" stroke="#b77893" strokeWidth="2" />
    <path d="M25 76Q140 106 255 76M59 82Q67 30 140 16M103 89Q105 36 140 16M177 89Q175 36 140 16M221 82Q213 30 140 16" fill="none" stroke="#e2c7d3" strokeWidth="2" />
    <path d="M36 70Q140 90 244 70M54 49Q140 65 226 49" fill="none" stroke="#ead9e1" strokeWidth="2" />
    <rect x="117" y="94" width="46" height="17" rx="3" fill="#a93164" /><path d="M140 95V110" stroke="#fff" strokeWidth="2" />
  </svg>;
}

export function TokyoDomeVisitorGuide() {
  return <div className={`zr-container ${styles.guide}`}>
    <section id="dome-spots" aria-labelledby="dome-spots-title" className={styles.section}>
      <h2 id="dome-spots-title">必要な設備を探す</h2>
      <TokyoDomeGuideFinder />
    </section>

    <section id="dome-access" aria-labelledby="dome-access-title" className={styles.section}>
      <h2 id="dome-access-title"><TrainFront aria-hidden="true" />駅から東京ドームへ</h2>
      <div className={styles.accessDiagram}>
        <div className={styles.routes}>{DOME_STATIONS.flatMap(station => station.exit.split("・").map(exit => ({ ...station, exit }))).map((station) => <TokyoDomeStationLink key={`${station.line}-${station.exit}`} stationId={tokyoDomeAccessStation(station.line,station.exit)!.id} className={`${styles.route} ${styles.routeLink}`} label={`${station.line} ${station.name} ${station.exit}から東京ドームへのマップを見る`}>
          <TrainFront className={styles.trainIcon} size={23} aria-hidden="true" />
          <div><small>{station.line.replace("中央・総武線（各駅停車）", "中央・総武線").replace("東京メトロ", "")}</small><h3>{station.name}</h3>{TOKYO_DOME_STATION_WALKING.stationIds.includes(tokyoDomeAccessStation(station.line,station.exit)!.id)&&<span className={styles.routeWalk}>{TOKYO_DOME_STATION_WALKING.label}</span>}</div>
          <strong>{station.exit}</strong><span className={styles.routeDestination}><ArrowRight size={16} aria-hidden="true" />東京ドーム</span><span className={styles.routeMapAction}>マップを見る<ArrowUpRight size={16} aria-hidden="true" /></span>
        </TokyoDomeStationLink>)}</div>
        <div className={styles.arrival}><DomeDrawing /><strong>東京ドーム</strong><a className={styles.solidAction} href="https://www.google.com/maps/search/?api=1&query=%E6%9D%B1%E4%BA%AC%E3%83%89%E3%83%BC%E3%83%A0" target="_blank" rel="noopener noreferrer"><MapPin size={19} aria-hidden="true" />地図を開く<ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </div>
      <p className={styles.walkNote}>駅からの目安です。出口・入場ゲート・混雑によって所要時間は変わります。<a href={TOKYO_DOME_STATION_WALKING.sourceUrl} target="_blank" rel="noopener noreferrer">公式の徒歩圏案内 ↗</a></p>
      <div className={styles.twoActions}><a href={sources.gates.url} target="_blank" rel="noopener noreferrer"><DoorOpen aria-hidden="true" /><span>入場ゲート<small>チケットの指定を確認</small></span><ArrowUpRight size={16} aria-hidden="true" /></a><a href={sources.access.url} target="_blank" rel="noopener noreferrer"><Accessibility aria-hidden="true" /><span>段差のないルート<small>水道橋駅西口はEVなし</small></span><ArrowUpRight size={16} aria-hidden="true" /></a></div>
      <details className={styles.explanation}><summary>アクセスの補足</summary>{DOME_STATIONS.map((station) => <p key={station.line}><strong>{station.line} {station.name}：</strong>{station.note}</p>)}<p>東京都文京区後楽1-3-61。出口の対応図です。実際の道順は地図・公式ルートで確認できます。</p></details>
    </section>

    <section id="dome-prepare" aria-labelledby="dome-prepare-title" className={styles.section}>
      <h2 id="dome-prepare-title"><Luggage aria-hidden="true" />出発前に、この3つ</h2>
      <div className={styles.prepareTiles}>
        <a href={sources.payment.url} target="_blank" rel="noopener noreferrer"><span className={styles.bigPictogram} aria-hidden="true"><CreditCard size={42} /><Smartphone size={29} /></span><strong>現金 ×</strong><span>カード・スマホ決済</span><small>場内</small></a>
        <VenueLuggageLink href="#dome-spots"><span className={styles.bigPictogram} aria-hidden="true"><Luggage size={45} /><ArrowRight size={22} /></span><strong>荷物</strong><span>ロッカー・預け先を探す</span><small>場内・周辺</small></VenueLuggageLink>
        <a href="#upcoming-events-title"><span className={styles.bigPictogram} aria-hidden="true"><Ticket size={48} /></span><strong>チケット</strong><span>時刻・ゲート</span><small>公演の案内へ</small></a>
      </div>
    </section>

    <section id="dome-faq" aria-labelledby="dome-faq-title" className={styles.section}>
      <h2 id="dome-faq-title"><CircleHelp aria-hidden="true" />気になることだけ</h2>
      <div className={styles.faq}>{DOME_GUIDE_FAQ.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p><a href={sources[item.source].url} target="_blank" rel="noopener noreferrer">公式案内 ↗</a></details>)}</div>
      <a className={styles.eventAction} href="#upcoming-events-title"><Ticket size={25} aria-hidden="true" /><strong>公演・座席レポを見る</strong><ArrowRight size={20} aria-hidden="true" /></a>
      <details className={styles.explanation}><summary>情報元・確認日</summary><p>{DOME_GUIDE_CHECKED_AT} 確認</p><ul>{Object.entries(sources).map(([id, source]) => <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ul></details>
    </section>
  </div>;
}
