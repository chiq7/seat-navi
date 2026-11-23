"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import ArtistGroupPhoto from "@/components/common/ArtistGroupPhoto";
import { getArtistGroupImage } from "@/lib/artistGroupImages";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Plus, Map } from "lucide-react";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { discoveryDateLabel, discoveryLotterySummary, seatDiscoveryLinks, summarizeDiscovery, type SeatDiscoveryData } from "@/lib/seatDiscovery";
import styles from "./SeatDiscoveryCard.module.css";
import { getPublicVenueGuideId, getPublicVenueName, getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import { EventPredictionSwitch } from "@/components/arena-map/EventPredictionSwitch";
import { isEventPredictionEnabled } from "@/lib/arena-map/eventPredictionInput";
import { predictionDetailHref, type PredictionView } from "@/lib/arena-map/predictionNavigation";

const ignoreAddress = () => {};

export default function SeatDiscoveryCard({ data, favoriteControl, venuePhotoCounts, preview = false, historical = false }: { data: SeatDiscoveryData; favoriteControl?: ReactNode; venuePhotoCounts?: Readonly<Record<string, number>>; preview?: boolean; historical?: boolean; sourceNote?: string }) {
  const [chosenEventId, setChosenEventId] = useState<string>();
  const days = data.events.map(event => ({
    event,
    summary: summarizeDiscovery({ ...data, events: [event], selectedEventId: event.id }),
  }));
  const defaultDay = days.find(day => day.event.id === data.selectedEventId);
  const firstReportedDay = days.find(day => day.event.date >= (defaultDay?.event.date ?? "") && day.summary.hasMap);
  const day = days.find(item => item.event.id === chosenEventId)
    ?? (preview || historical || defaultDay?.summary.hasMap ? defaultDay : firstReportedDay)
    ?? defaultDay ?? days[0];
  const event = day?.event;
  const eventId = event?.id ?? data.selectedEventId;
  const summary = day?.summary;
  const [view, setView] = useState<PredictionView>();
  // The normal upcoming and historical cards stay light: only the explicit local preview opts in.
  const predictionPreview = preview && isEventPredictionEnabled(eventId);
  const links = seatDiscoveryLinks(data.artistSlug, eventId);
  const mapHref = predictionPreview ? predictionDetailHref(eventId, view?.date === event?.date ? view : undefined) : links.map + "#seat-map";
  const tourTitle = event?.title.startsWith(data.artistName) ? event.title.slice(data.artistName.length).trim() : event?.title;
  const ready = data.status === "ready";
  const hasMap = ready && Boolean(summary?.hasMap);
  const showMapExample = ready && !data.limited && !historical;
  const venueId = getPublicVenueGuideId(event?.venue_id, event?.venue);
  const venueSeatHref = getPublicVenueSeatGuideHref(venueId);
  const venueName = venueId ? getPublicVenueName(venueId, event?.venue ?? "") : event?.venue;
  const photoCount = venueId ? venuePhotoCounts?.[venueId] : undefined;
  const lottery = discoveryLotterySummary(data);
  const instanceId = data.artistSlug + "-" + data.selectedEventId + (preview ? "-preview" : "");
  const arenaMap = summary && <ArenaReportMap eventId={eventId} reports={summary.seats} externalObservations={summary.external}
    variant="compact" positionOnlyPreview highlightPositionsPreview hideShareSection />;

  return (
    <article id={preview ? "seat-card-preview" : undefined} aria-label={data.artistName + "の座席情報"} className={styles.card}>
      <header className={styles.header}>
        <div className={styles.avatar}>
          {getArtistGroupImage(data.artistSlug)
            ? <ArtistGroupPhoto key={data.artistSlug} slug={data.artistSlug} name={data.artistName} />
            : <Image src={data.image} alt="" fill sizes="44px" className="object-cover" />}
        </div>
        {/* Name and tour together open the artist page, the hub for every date of this artist. */}
        <Link href={links.artist} className={"zr-focus " + styles.identity + " " + styles.identityLink}>
          <span className={styles.title}>{data.artistName}<ArrowUpRight size={16} aria-hidden="true" /></span>
          <span className={styles.tour}>{tourTitle || (ready ? "公演の座席情報" : "公演情報を読み込めませんでした")}</span>
        </Link>
        {favoriteControl}
      </header>

      {event && <div className={styles.meta}>
        <p><MapPin size={15} aria-hidden="true" /><strong>{venueName}</strong></p>
        <p className={styles.dateRow}><CalendarDays size={15} aria-hidden="true" /><span>{historical && <><strong className={styles.pastLabel}>過去公演</strong>{event.date.slice(0, 4)}年 · </>}{data.events.map(item => discoveryDateLabel(item.date)).join("・")}</span>{venueSeatHref && <Link href={venueSeatHref} className={"zr-focus " + styles.inlineMap} data-home-venue-link>{venueName}の座席表{photoCount !== undefined && `（${photoCount}枚）`}<ArrowUpRight size={14} aria-hidden="true" /></Link>}</p>
      </div>}

      {event && summary && (hasMap || showMapExample) && (
        <figure className={styles.figure}>
          <div className={styles.figureLabel}>
            {hasMap ? "アリーナ座席表（報告位置）" : "アリーナ座席表の表示例"}
            <time dateTime={event.date}>{discoveryDateLabel(event.date)}</time>
          </div>
          {hasMap && predictionPreview ? <div className={styles.map}>
            <EventPredictionSwitch key={eventId} eventId={eventId} reports={data.reports} external={data.externalObservations}
              events={data.events} compact onAddressChange={ignoreAddress} onViewChange={setView}
              readState={data.status === "ready" ? "ready" : "unavailable"} limited={data.limited}>
              {arenaMap}
            </EventPredictionSwitch>
          </div> : hasMap ? <Link href={mapHref} aria-label={data.artistName + "の座席表を詳しく見る"} className={"zr-focus " + styles.map + " " + styles.fixedMap}>
            {arenaMap}
          </Link> : <div className={styles.map + " " + styles.fixedMap}>{arenaMap}</div>}
          <figcaption className={styles.figureCaption}>
            {hasMap ? <>
              {summary.blocks.length > 0 && <span className={styles.blocks}><span aria-hidden="true" className={styles.dot} />{summary.blocks.slice(0, 6).join(" · ")}{summary.blocks.length > 6 && " …"}</span>}
              {summary.external.length > 0 && <span>X投稿などの座席情報を含みます</span>}
            </> : "座席の報告が届くと、図に位置が表示されます。"}
          </figcaption>
        </figure>
      )}

      {event && <div className={styles.actions}>
        <div className={styles.reportRow}>
          <label htmlFor={"seat-day-" + instanceId} className={styles.srOnly}>公演日</label>
          <select id={"seat-day-" + instanceId} value={eventId} onChange={e => setChosenEventId(e.target.value)} className={"zr-focus " + styles.select}>
            {data.events.map(item => <option key={item.id} value={item.id} data-event-date={item.date}>{discoveryDateLabel(item.date)}</option>)}
          </select>
          <Link href={links.report} className={"zr-focus " + styles.secondary}><Plus size={16} aria-hidden="true" />座席を報告</Link>
        </div>
        <Link href={links.map} data-home-event-link className={"zr-focus " + styles.detailLink}>
          {hasMap && <Map size={16} aria-hidden="true" />}{discoveryDateLabel(event.date)}の座席・アリーナ図を見る<ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>}

      {lottery && <details className={styles.stats}>
        <summary className={"zr-focus " + styles.statsSummary}>申込結果{lottery.total}件（当選{lottery.won}・落選{lottery.lost}）</summary>
        <div className={styles.statsBody}>
          <p className={styles.note}>{lottery.scopeLabel} · {lottery.lotteryLabel}</p>
          <dl className="space-y-2 text-[12px] text-[#625a61]">
            <div className="flex justify-between gap-3"><dt>通常チケットのアリーナ</dt><dd>{lottery.normalArenaPercent != null && lottery.normalArena ? `${lottery.normalArena.won} / ${lottery.normalArena.total}件` : "報告なし"}</dd></div>
            <div className="flex justify-between gap-3"><dt>アップグレード当選</dt><dd>{lottery.upgradePercent != null && lottery.upgrade ? `${lottery.upgrade.won} / ${lottery.upgrade.total}件` : "報告なし"}</dd></div>
          </dl>
          <p className={styles.note}>投稿された申込結果です。公式の当選確率ではありません。</p>
          <Link href={links.lottery} className="zr-focus mt-2 flex min-h-11 items-center text-[12px] font-bold text-[#a41c53]">全公演の報告・集計の見方 →</Link>
        </div>
      </details>}
    </article>
  );
}
