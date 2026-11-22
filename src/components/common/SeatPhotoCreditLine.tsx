import { SEAT_VERIFIED_LABEL, seatPhotoCredit } from "@/lib/seatPhotoCaption";
import styles from "@/components/venue/template/SeatViewPosts.module.css";

/** The photo's date, performance and verified seat when they are known; nothing when none is. */
export function SeatPhotoCreditLine({ event, verified }: { event?: string; verified?: boolean }) {
  const { day, name } = seatPhotoCredit(event);
  if (!day && !name && !verified) return null;
  return <p className={styles.eventContext} data-seat-photo-caption>
    {day && <span>{day}</span>}
    {name && <span className={styles.creditName}>{name}</span>}
    {verified && <span>{SEAT_VERIFIED_LABEL}</span>}
  </p>;
}
