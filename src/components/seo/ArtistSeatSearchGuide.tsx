import Link from "next/link";
import { PRIORITY_PERFORMANCES, matchPriorityPerformance } from "@/data/priorityPerformances";
import { getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import type { CrawledEvent } from "@/lib/types";
import { numberITourEvents } from "@/lib/searchContentGuides";
import { NUMBER_I_STOPS, NUMBER_I_TOUR_SOURCE } from "@/data/searchContentGuides";
import styles from "./SearchContentGuides.module.css";

export default function ArtistSeatSearchGuide({ slug, events }: { slug: string; events: CrawledEvent[] }) {
  if (slug === "hana") {
    return <section className={styles.section} aria-labelledby="hana-seat-guide-title">
      <h2 id="hana-seat-guide-title">HANAの公演・座席表を探す</h2>
      <p>Born to Bloom追加公演と、ASIA POP GIRL FEST 2027の出演日程。会場の常設席と、公演ごとのアリーナ配置を分けて確認できます。</p>
      <div className={styles.rows}>{PRIORITY_PERFORMANCES.filter(day => day.artist === "hana").map(day => {
        const matched = events.filter(event => matchPriorityPerformance(event) === day);
        const venueHref = getPublicVenueSeatGuideHref(day.venueId);
        return <div className={styles.row} key={day.date}><div><strong>{day.date.replaceAll("-", "/")} {day.venue}</strong><p className={styles.dates}>{day.title} / 開演 {day.starts.join("・")}</p>
          <div className={styles.links}>{matched.map(event => <Link key={event.id} href={`/events/${event.id}`} className={`${styles.link} zr-focus`}>公演の座席・レポを見る →</Link>)}<a href={day.source} className={`${styles.link} zr-focus`} target="_blank" rel="noopener noreferrer">公式案内 ↗</a></div>
        </div>{venueHref && <Link href={venueHref} className={`${styles.action} zr-focus`}>会場の座席表を見る</Link>}</div>;
      })}</div>
      <p>ステージ・花道・アリーナのブロックは公演ごとに変わります。座席の表示日時は購入先と公式案内を確認してください。終了公演の記録も、次の公演と同じ配置と断定せず参考にしてください。</p>
    </section>;
  }
  if (slug !== "number-i") return null;
  return <section className={styles.section} aria-labelledby="number-i-seat-guide-title">
    <p className={styles.eyebrow}>Number_i LIVE TOUR No.Ⅲ</p>
    <h2 id="number-i-seat-guide-title">Number_iの座席表を会場から探す</h2>
    <ul className={styles.steps}>
      <li><a className="zr-focus underline underline-offset-4" href={NUMBER_I_TOUR_SOURCE} target="_blank" rel="noopener noreferrer">主催者のシートマップを見る ↗</a>。公式ページの「SEAT MAP」で、京セラドーム大阪・東京ドームなど、行く会場の公演用の図を確認できます。</li>
      <li><strong>スタンド席の列・番号を探す</strong>。下の「会場の座席表を見る」から、会場の常設席を確認できます。</li>
      <li><strong>同じ日の座席報告を見る</strong>。下の公演日を選ぶと、その公演のページで投稿状況を確認できます。</li>
    </ul>
    <div className={styles.rows}>{NUMBER_I_STOPS.map(stop => {
      const matched = numberITourEvents(events, stop.venueId, stop.dates);
      return <div className={styles.row} key={stop.venueId}><div>
        <strong>{stop.name}</strong><p className={styles.dates}>{stop.dates.map(date => date.replaceAll("-", "/")).join("・")}</p>
        {stop.venueId === "vantelin-dome" && <p className={styles.dates}>1月10日は昼・夜の2公演。券面の開演時刻も確認してください。</p>}
        {matched.length > 0 && <div className={styles.links}>{matched.map(event => <Link key={event.id} href={`/events/${event.id}`} className={`${styles.link} zr-focus`}>{event.date?.slice(5).replace("-", "/")} 公演情報 →</Link>)}</div>}
      </div><Link className={`${styles.action} zr-focus`} href={getPublicVenueSeatGuideHref(stop.venueId) ?? `/venues/${stop.venueId}`}>会場の座席表を見る →</Link></div>;
    })}</div>
    <ol className={styles.steps}><li>チケットの会場名と日付を確認して、上の会場を選びます。</li><li>スタンドは席種・方向を選び、列・番号で検索します。同じ列・番号が複数ある場合は候補から選べます。</li><li>アリーナのブロック名・ステージ位置は公演ごとに異なります。別日や過去ツアーの配置を今回の確定図として使わないでください。</li></ol>
    <a className={`${styles.link} zr-focus`} href={NUMBER_I_TOUR_SOURCE} target="_blank" rel="noopener noreferrer">公式のツアー日程を見る ↗</a>
  </section>;
}
