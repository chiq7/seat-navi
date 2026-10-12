import { Accessibility, ArrowRight, ArrowUpRight, CircleHelp, CreditCard, DoorOpen, Luggage, Smartphone, Ticket, TrainFront } from "lucide-react";
import content from "@/data/venueGuides/kyocera-dome/visitor-content.json";
import VenueLuggageLink from "../template/VenueLuggageLink";
import styles from "../TokyoDomeVisitorGuide.module.css";
import type { DedicatedVenueGuide } from "@/data/venueGuides/types";
import VenueAccessCards from "../template/VenueAccessCards";
import { accessTarget } from "@/lib/venueAccess";

const stationDisplay = [
  { id: "access-metro", line: "長堀鶴見緑地線", name: "ドーム前千代崎駅", walk: "徒歩すぐ", exit: "1番出口" },
  { id: "access-hanshin", line: "阪神なんば線", name: "ドーム前駅", walk: "徒歩すぐ", exit: "1・2出口" },
  { id: "access-jr", line: "JR大阪環状線", name: "大正駅", walk: "徒歩約7分", exit: "" },
  { id: "access-kujo", line: "中央線", name: "九条駅", walk: "徒歩約9分", exit: "" },
];

function References({ item }: { item: typeof content.access[number] | typeof content.preparation[number] | typeof content.faq[number] }) {
  return <a href={item.sources[0].url} target="_blank" rel="noopener noreferrer">公式案内 ↗</a>;
}

// Tokyo's actual visitor layout/CSS, with only Kyocera's reviewed facts.
// No coordinates, original diagrams, payment assumptions or production data.
export default function KyoceraVisitorContent({guide}:{guide:DedicatedVenueGuide}) {
  const payment = content.preparation.find(item => item.id === "prep-payment")!;
  const baggage = content.preparation.find(item => item.id === "prep-baggage")!;
  const ticket = content.preparation.find(item => item.id === "prep-ticket")!;
  const support = content.access.find(item => item.id === "access-gates")!;
  const elevator = content.access.find(item => item.id === "access-elevator")!;
  return <div className={`zr-container ${styles.guide}`}>
    <section id="venue-access" aria-labelledby="outside-heading" className={styles.section}>
      <h2 id="outside-heading"><TrainFront aria-hidden="true" />駅から京セラドーム大阪へ</h2>
      <VenueAccessCards venueId="kyocera-dome" destination="京セラドーム大阪" entries={stationDisplay.flatMap(station=> (station.exit==="1・2出口" ? ["1番出口","2番出口"] : [station.exit]).map(exit=>({...station,exit}))).map((station,index)=>({id:`kyocera-${index}`,from:station.name,exit:station.exit,line:station.line,time:station.walk,sourceUrl:"https://www.kyoceradome-osaka.jp/access/",...accessTarget(guide,{from:station.name,line:station.line,exit:station.exit})}))}/>
      <p className={styles.walkNote}>徒歩は駅からの目安です。入場ゲート・混雑によって所要時間は変わります。</p>
      <div className={styles.twoActions}><a href={support.sources[0].url} target="_blank" rel="noopener noreferrer"><DoorOpen aria-hidden="true" /><span>指定入口を確認<small>入場ゲートは3F</small></span><ArrowUpRight size={16} aria-hidden="true" /></a><a href={elevator.sources[0].url} target="_blank" rel="noopener noreferrer"><Accessibility aria-hidden="true" /><span>エレベーター<small>東口付近から3Fへ</small></span><ArrowUpRight size={16} aria-hidden="true" /></a></div>
      <details className={styles.explanation}><summary>駅・入口・利用経路の補足</summary>
        {content.access.map(item => <div key={item.id}><p><strong>{item.title}：</strong>{item.userText}</p><References item={item} /></div>)}
        <p>段差なしで移動したい場合は、公式アクセス・施設サポートで利用経路を確認してください。入口はチケットと公演案内に従ってください。</p>
      </details>
    </section>
    <section id="venue-prep" aria-labelledby="prepare-heading" className={styles.section}>
      <h2 id="prepare-heading"><Luggage aria-hidden="true" />出発前に、この3つ</h2>
      <div className={styles.prepareTiles}>
        <a href={payment.sources[0].url} target="_blank" rel="noopener noreferrer"><span className={styles.bigPictogram} aria-hidden="true"><CreditCard size={42} /><Smartphone size={29} /></span><strong>店ごとの決済</strong><span>カード・電子・コード決済</span><small>一部例外・PiTaPa対象外</small></a>
        <VenueLuggageLink href="#venue-facilities"><span className={styles.bigPictogram} aria-hidden="true"><Luggage size={45} /><ArrowRight size={22} /></span><strong>荷物</strong><span>ロッカー・預け先を探す</span><small>場内・周辺</small></VenueLuggageLink>
        <a href="#upcoming-events-title"><span className={styles.bigPictogram} aria-hidden="true"><Ticket size={48} /></span><strong>時刻・指定入口</strong><span>入場は3F・公演案内を優先</span><small>座席・変更席を確認</small></a>
      </div>
      <details className={styles.explanation}><summary>支払い・荷物・券面の確認事項</summary>{[payment,baggage,ticket].map(item => <div key={item.id}><p><strong>{item.title}：</strong>{item.userText}</p><References item={item} /></div>)}<p>現金の取扱いは各店舗で確認してください。公演グッズは販売元の案内を確認してください。</p></details>
    </section>
    <section id="venue-faq" aria-labelledby="faq-heading" className={styles.section}>
      <h2 id="faq-heading"><CircleHelp aria-hidden="true" />気になることだけ</h2>
      <div className={styles.faq}>{content.faq.map(item => <details key={item.id} data-content-id={item.id}><summary>{item.title}</summary><p>{item.id === "faq-lockers" ? "2Fスタジアムモールのロッカーに加え、周辺の駅や店舗の荷物預かりを設備の「荷物」から探せます。大きさ・利用時間・予約可否を確認してください。" : item.userText}</p><References item={item} /></details>)}</div>
      <a className={styles.eventAction} href="#upcoming-events-title"><Ticket size={25} aria-hidden="true" /><strong>公演・座席レポを見る</strong><ArrowRight size={20} aria-hidden="true" /></a>
    </section>
  </div>;
}
