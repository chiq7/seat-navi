import { ArrowDown, ArrowUpRight } from "lucide-react";
import DiscoveryLink from "@/components/common/DiscoveryLink";
import { formatEventDate } from "@/components/common/EventListRow";
import { resolveArtist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import type { CrawledEvent } from "@/lib/types";
import styles from "./VenueProgramLinks.module.css";

export function VenueProgramJump({ venueId, upcomingCount, pastCount }: { venueId: string; upcomingCount: number; pastCount: number }) {
  if (upcomingCount === 0 && pastCount === 0) return null;
  const upcoming = upcomingCount > 0;
  const target = upcoming ? "upcoming-events-title" : "past-events-title";
  return (
    <div className={`zr-container ${styles.jump}`}>
      <DiscoveryLink href={`#${target}`} className="zr-focus" discovery={{ source: "venue_jump", destination: "section", destinationId: target, venueId }}>
        {upcoming ? "公演・アーティストを見る" : "過去の公演・アーティストを見る"}<ArrowDown size={16} aria-hidden="true" />
      </DiscoveryLink>
    </div>
  );
}

export function VenueProgramList({ venueId, events, emptyText, initialCount = 6 }: { venueId: string; events: CrawledEvent[]; emptyText: string; initialCount?: number }) {
  if (events.length === 0) return <p className={styles.empty}>{emptyText}</p>;
  const renderRows = (rows: CrawledEvent[]) => (
    <ul className={styles.list}>
      {rows.map(event => {
        const artist = resolveArtist(event);
        const { tourName, isTestData } = parseEventTitle(event.title, artist?.name);
        return (
          <li key={event.id} className={styles.card}>
            <time dateTime={event.date ?? undefined} className={styles.date}>{formatEventDate(event.date)}</time>
            <div className={styles.content}>
              <p className={styles.artist}>{artist?.name ?? tourName}</p>
              {artist && tourName !== artist.name && <p className={styles.title}>{tourName}</p>}
              {isTestData && <span className={styles.test}>TEST</span>}
            </div>
            <div className={styles.actions}>
              <DiscoveryLink href={`/events/${event.id}`} className={`zr-focus ${styles.eventLink}`} discovery={{ source: "venue_event", destination: "event", destinationId: event.id, venueId }} aria-label={`${tourName} ${formatEventDate(event.date)}の公演の座席・レポを見る`}>
                公演の座席・レポ<ArrowUpRight size={15} aria-hidden="true" />
              </DiscoveryLink>
              {artist && <DiscoveryLink href={`/artists/${artist.slug}`} className="zr-focus" discovery={{ source: "venue_artist", destination: "artist", destinationId: artist.slug, venueId }} aria-label={`${artist.name}のアーティストページを見る`}>
                アーティストページ<ArrowUpRight size={15} aria-hidden="true" />
              </DiscoveryLink>}
            </div>
          </li>
        );
      })}
    </ul>
  );
  const visibleCount = Math.max(1, initialCount);
  const remaining = events.slice(visibleCount);
  return (
    <div>
      {renderRows(events.slice(0, visibleCount))}
      {remaining.length > 0 && <details className={styles.more}>
        <summary className="zr-focus">残り{remaining.length}公演を見る</summary>
        {renderRows(remaining)}
      </details>}
    </div>
  );
}
