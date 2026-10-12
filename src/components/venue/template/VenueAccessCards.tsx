"use client";
import { ArrowRight, MapPin } from "lucide-react";
import { VENUE_ACCESS_EVENT, type VenueAccessEntry } from "@/lib/venueAccess";
import styles from "./VenueAccessCards.module.css";

export default function VenueAccessCards({ venueId, destination, entries, eventName }: { venueId: string; destination: string; entries: VenueAccessEntry[]; eventName?: string }) {
  return <div className={styles.cards} data-venue-access={venueId}>{entries.map(entry => {
    const local = Boolean(entry.targetId && (entry.diagramId || eventName));
    const mapLabel = local ? "マップ" : "公式地図";
    const exitNote = entry.exit.match(/[（(][^）)]*[）)]/g)?.join(" ") ?? "";
    const withoutNote = entry.exit.replace(/[（(][^）)]*[）)]/g, "").trim();
    const railway = withoutNote.match(/^(.+線)・(.+(?:出口|口|改札))$/);
    const exitLabel = railway?.[2] ?? withoutNote;
    const lineLabel = [entry.line, railway?.[1], exitNote].filter(Boolean).join(" ");
    return <a key={entry.id} className={styles.card} data-access-id={entry.id} data-access-target={entry.targetId ?? ""} data-access-diagram={entry.diagramId ?? ""}
      href={local ? venueId === "tokyo-dome" ? "#dome-outside-map" : "#venue-facilities" : entry.sourceUrl}
      target={local ? undefined : "_blank"} rel={local ? undefined : "noopener noreferrer"}
      aria-label={`${entry.line} ${entry.from} ${entry.exit}から${destination}への${mapLabel}を見る、${entry.time}`}
      onClick={local ? event => { event.preventDefault(); window.dispatchEvent(new CustomEvent(eventName ?? VENUE_ACCESS_EVENT, { detail: eventName ? entry.targetId : { venueId, targetId: entry.targetId, diagramId: entry.diagramId } })); } : undefined}>
      <span className={styles.top}><span className={styles.path}><strong className={styles.origin}><span className={styles.station} title={entry.from}>{entry.from}</span>{exitLabel && <span className={styles.exit}>{exitLabel}</span>}</strong><ArrowRight size={14} aria-hidden="true"/><span className={styles.destination}><span className={styles.fullDestination}>{destination}</span><span className={styles.shortDestination}>{venueId === "tokyo-dome" ? "東京ドーム" : "会場"}</span></span></span><span className={styles.map}><MapPin size={13} aria-hidden="true"/>{mapLabel}</span></span>
      <span className={styles.meta}><strong>{entry.time}</strong><span className={styles.line} title={lineLabel}>{lineLabel}</span></span>
    </a>;
  })}</div>;
}
