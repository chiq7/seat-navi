"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { InfoListRow } from "@/components/common/InfoListRow";
import { STATIC_PUBLIC_PAGES, formatPublicDataTime, publicPageDataPaths, publicPageRefreshSeconds, type VenuePrograms } from "@/lib/publicPageData";
import { useFreshPublicData } from "@/lib/useFreshPublicData";
import { ArrowDown, ArrowUpRight, MapPin, MoveRight, Users } from "lucide-react";
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
        {upcoming ? "公演別の座席・レポを探す" : "過去公演の座席・レポを探す"}<ArrowDown size={16} aria-hidden="true" />
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

type VenueProgramsState = { available: boolean; upcoming: CrawledEvent[]; past: CrawledEvent[]; failed: boolean; staleAt: string | null; retry: () => void };
const ProgramsContext = createContext<VenueProgramsState | null>(null);

export function VenueProgramsProvider({ venueId, initial, children }: { venueId: string; initial: VenuePrograms; children: ReactNode }) {
  const path = STATIC_PUBLIC_PAGES ? publicPageDataPaths.venue + venueId : undefined;
  const { data, failed, staleAt, retry } = useFreshPublicData(path, publicPageRefreshSeconds.venue, initial);
  const { events, today } = data;
  const { upcoming, past } = useMemo(() => ({
    upcoming: events?.filter(event => event.date && event.date >= today) ?? [],
    past: events?.filter(event => event.date && event.date < today).reverse() ?? [],
  }), [events, today]);
  return <ProgramsContext value={{ available: events !== null, upcoming, past, failed, staleAt, retry }}>{children}</ProgramsContext>;
}

function useVenuePrograms() {
  const programs = useContext(ProgramsContext);
  if (!programs) throw new Error("VenueProgramsProvider is missing");
  return programs;
}

export function VenueProgramNavigation({ venueId }: { venueId: string }) {
  const { upcoming, past } = useVenuePrograms();
  return <VenueProgramJump venueId={venueId} upcomingCount={upcoming.length} pastCount={past.length} />;
}

export function VenueProgramSummary() {
  const { available, upcoming, past } = useVenuePrograms();
  if (!available) return null;
  return (
    <div className="mt-4 grid grid-cols-2 border-y border-white/85 bg-white/65 px-1 backdrop-blur-sm sm:max-w-[420px]">
      <div>
        <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">UPCOMING</p>
        <p className="mt-0.5 text-[23px] font-black">{upcoming.length}</p>
      </div>
      <div className="border-l border-[#eadfe4] pl-5">
        <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">PAST LIVE</p>
        <p className="mt-0.5 text-[23px] font-black">{past.length}</p>
      </div>
    </div>
  );
}

export function VenueProgramSections({ venueId, publicName }: { venueId: string; publicName: string }) {
  const { available, upcoming, past, failed, staleAt, retry } = useVenuePrograms();
  const pastArtists = Array.from(
    new Map(
      past.flatMap((event) => {
        const artist = resolveArtist(event);
        return artist ? [[artist.slug, artist] as const] : [];
      }),
    ).values(),
  ).slice(0, 30);
  return (
    <>
        <section className="py-8 sm:py-10" aria-labelledby="upcoming-events-title">
          <p className="artist-kicker">Upcoming Live</p>
          <h2 id="upcoming-events-title" className="artist-heading scroll-mt-[90px]">これからの公演・アーティスト {available && <small>（{upcoming.length}件）</small>}</h2>
          <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[#817981]"><MapPin size={14} className="text-[#f43679]" />{publicName}のライブ予定</p>
          {failed && available && <p className="mt-3 text-sm" role="status">最新の公演一覧を読み込めませんでした。<button type="button" className="zr-focus ml-2 min-h-11 underline" onClick={retry}>再試行</button></p>}
          {staleAt && <p className="mt-3 text-sm" role="status">{formatPublicDataTime(staleAt)}時点の公演一覧です。</p>}
          <div className="mt-3">{available ? <VenueProgramList venueId={venueId} events={upcoming} emptyText={staleAt ? "保存分に開催予定はありません" : "現在、登録されている開催予定はありません"} initialCount={3} /> : <p role="status">公演一覧を読み込めませんでした。<a className="zr-focus ml-2 inline-flex min-h-11 items-center font-bold underline" href={`/venues/${venueId}#upcoming-events-title`}>もう一度読み込む</a></p>}</div>
        </section>

        {past.length > 0 && (
          <section className="py-8 sm:py-10" aria-labelledby="past-events-title">
            <p className="artist-kicker">Live Archive</p>
            <h2 id="past-events-title" className="artist-heading scroll-mt-[90px]">過去の公演・座席レポ</h2>
            <div className="mt-3"><VenueProgramList venueId={venueId} events={past.slice(0, 30)} emptyText="過去の公演はありません" /></div>
          </section>
        )}

        {pastArtists.length > 0 && (
          <section className="py-8 sm:py-10" aria-labelledby="venue-artists-title">
            <p className="artist-kicker">Artists Archive</p>
            <h2 id="venue-artists-title" className="artist-heading">この会場で公演したアーティスト</h2>
            <div className="mt-3 border-y border-[#ded8dc] bg-white">
              {pastArtists.slice(0, 8).map((artist) => (
                <InfoListRow
                  key={artist.slug}
                  href={`/artists/${artist.slug}`}
                  ariaLabel={`${artist.name}のアーティストページを見る`}
                >
                  <Users size={16} className="justify-self-center text-[#f43679]" /><span className="truncate text-[14px] font-black text-[#4b4148]">{artist.name}</span><MoveRight size={17} className="text-[#f43679]" />
                </InfoListRow>
              ))}
            </div>
            {pastArtists.length > 8 && (
              <details className="group mt-4">
                <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#c93868]">残り{pastArtists.length - 8}組を見る</summary>
                <div className="mt-4 border-y border-[#ded8dc] bg-white">
                  {pastArtists.slice(8).map((artist) => (
                    <InfoListRow key={artist.slug} href={`/artists/${artist.slug}`} ariaLabel={`${artist.name}のアーティストページを見る`}>
                      <Users size={16} className="justify-self-center text-[#f43679]" /><span className="truncate text-[14px] font-black text-[#4b4148]">{artist.name}</span><MoveRight size={17} className="text-[#f43679]" />
                    </InfoListRow>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}
    </>
  );
}
