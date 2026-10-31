import Link from "next/link";
import type { CrawledEvent } from "@/lib/types";
import { matchPriorityPerformance } from "@/data/priorityPerformances";
import { getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import styles from "./SearchContentGuides.module.css";

export default function PriorityPerformanceGuide({ event }: { event: CrawledEvent }) {
  const day = matchPriorityPerformance(event);
  if (!day) return null;
  const venueHref = getPublicVenueSeatGuideHref(day.venueId);
  return <div className="zr-container"><section className={styles.section} aria-labelledby="performance-preparation-title">
    <h2 id="performance-preparation-title">この公演の座席を調べる前に</h2>
    <p><strong>{day.date.replaceAll("-", "/")}・{day.venue}</strong><br />開演 {day.starts.join(" / ")}（日本時間）</p>
    {day.starts.length > 1 && <p>このページは同日の2公演をまとめて掲載しています。チケットの開演時刻を確認し、報告するときは昼・夜のどちらかをメモに添えてください。</p>}
    <p>スタンドの常設席と、公演ごとに設営するアリーナを分けて確認してください。過去公演のステージ・花道・ブロック配置は、この公演の確定図ではありません。</p>
    <p>座席番号の表示日時は、チケットの購入先と主催者の案内を確認してください。未確認の表示日や座席配置は掲載していません。</p>
    <div className={styles.links}>
      {venueHref && <Link href={venueHref} className={`${styles.action} zr-focus`}>会場の座席表を見る</Link>}
      <Link href={`/report/ticket?event=${encodeURIComponent(event.id)}`} className={`${styles.link} zr-focus`}>この公演の座席を報告する</Link>
      <Link href={`/report/live?event=${encodeURIComponent(event.id)}`} className={`${styles.link} zr-focus`}>見え方・現地レポを投稿する</Link>
    </div>
    <p className={styles.source}><a href={day.source} target="_blank" rel="noopener noreferrer" className={`${styles.link} zr-focus`}>公式の公演案内 ↗</a><br />日程確認：2026年10月31日。変更時は公式案内を優先してください。</p>
  </section></div>;
}
