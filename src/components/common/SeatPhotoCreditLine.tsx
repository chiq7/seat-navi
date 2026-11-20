import { ChevronDown } from "lucide-react";
import { seatPhotoCaption, seatPhotoCredit, seatPhotoPosition } from "@/lib/seatPhotoCaption";
import styles from "@/components/venue/template/SeatViewPosts.module.css";

export function SeatPhotoCreditLine({ event, verified, relation }: {
  event?: string; verified?: boolean; relation?: string;
}) {
  const { day, name } = seatPhotoCredit(event);
  const caption = seatPhotoCaption(event, verified, relation);
  return <details className={styles.eventContext} data-seat-photo-caption>
    <summary className="zr-focus" aria-label={caption + "。撮影情報の詳細"}>
      {day || name ? <>
        <span>{day || "撮影日不明"}</span>
        <span className={styles.creditName}>{name || "公演名不明"}</span>
      </> : <span className={styles.creditName}>撮影公演・日付は不明</span>}
      <span>{seatPhotoPosition(verified)}</span>
      <ChevronDown size={15} aria-hidden="true" />
    </summary>
    <p>{caption}</p>
  </details>;
}
