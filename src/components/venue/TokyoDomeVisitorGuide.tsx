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

export function TokyoDomeVisitorGuide() {
  return <div className={`zr-container ${styles.guide}`}>
    <section id="dome-spots" aria-labelledby="dome-spots-title" className={styles.section}>
      <h2 id="dome-spots-title">必要な設備を探す</h2>
      <TokyoDomeGuideFinder />
    </section>

    <section id="dome-access" aria-labelledby="dome-access-title" className={styles.section}>
      <h2 id="dome-access-title"><TrainFront aria-hidden="true" />駅から東京ドームへ</h2>
      <div className={styles.accessDiagram}>
        <div className={styles.routes}>{DOME_STATIONS.flatMap(station => station.exit.split("・").map(exit => ({ ...station, exit }))).map((station) => {
          const stationId = tokyoDomeAccessStation(station.line, station.exit)!.id;
          const walking = TOKYO_DOME_STATION_WALKING.stationIds.includes(stationId) ? TOKYO_DOME_STATION_WALKING.label : null;
          return <TokyoDomeStationLink key={`${station.line}-${station.exit}`} stationId={stationId} className={styles.routeLink} label={`${station.line} ${station.name} ${station.exit}から東京ドームへのマップを見る${walking ? `、${walking}の目安` : ""}`}>
            <span className={styles.routeTop}><span className={styles.routePath}><strong>{station.name} {station.exit}</strong><ArrowRight size={14} aria-hidden="true" /><span>東京ドーム</span></span><span className={styles.routeMapAction}><MapPin size={13} aria-hidden="true" />マップ</span></span>
            <span className={styles.routeMeta}>{walking && <span className={styles.routeWalk}>{walking}</span>}<span>{station.line.replace("中央・総武線（各駅停車）", "中央・総武線").replace("東京メトロ", "")}</span></span>
          </TokyoDomeStationLink>;
        })}</div>
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
