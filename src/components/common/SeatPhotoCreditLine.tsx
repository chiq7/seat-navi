import { seatPhotoCredit } from "@/lib/seatPhotoCaption";
import styles from "@/components/venue/template/SeatViewPosts.module.css";

/** The photo's date and performance when they are known; nothing when neither is. */
export function SeatPhotoCreditLine({ event }: { event?: string }) {
  const { day, name } = seatPhotoCredit(event);
  if (!day && !name) return null;
  return <p className={styles.eventContext} data-seat-photo-caption>
    {day && <span>{day}</span>}
    {name && <span className={styles.creditName}>{name}</span>}
  </p>;
}
