import "server-only";
import { createSupabasePublicClient } from "./supabase/public";
import { findArtistBySlug } from "./artists";
import { resolveArtistHeroImage } from "./artistPageData";
import type { SeatDiscoveryData, SeatDiscoveryEvent } from "./seatDiscovery";
import type { SeatReport } from "./types";
import type { ExternalSeatObservation } from "./external-seats/types";
import { reportedDiscoveryLottery } from "./seatDiscovery";
import { eventSeatGroup } from "./arena-map/eventSeatGroup";
import type { UpcomingEvent } from "./homeData";
import { readArenaReports } from "./arena-map/readArenaReports";
import { isEventPredictionEnabled } from "./arena-map/eventPredictionInput";

// Pilot configuration only. The card itself is artist/event independent.
export const SEAT_DISCOVERY_PILOT = {
  artistSlug: "stray-kids",
  venueId: "kyocera-dome",
  eventIds: ["93dec1e9b401d54ac03e", "42f4c61d6af9abb78c60"],
  selectedEventId: "42f4c61d6af9abb78c60",
};

/** Public SELECTs only. No writes; no private author/comment fields for card aggregates. */
export async function loadSeatDiscovery(config: { artistSlug: string; venueId: string | null; eventIds: string[]; selectedEventId: string } = SEAT_DISCOVERY_PILOT, knownEvents?: SeatDiscoveryEvent[]): Promise<SeatDiscoveryData> {
  const artist = findArtistBySlug(config.artistSlug);
  const base: SeatDiscoveryData = {
    artistSlug: config.artistSlug,
    artistName: artist?.name ?? config.artistSlug,
    image: resolveArtistHeroImage(artist?.heroImage),
    selectedEventId: config.selectedEventId,
    events: [], reports: [], externalObservations: [], status: "unavailable", limited: false,
    // The pilot's historical rows have unresolved resale provenance. Do not publish a rate.
    lottery: { status: "pending" },
  };
  const client = createSupabasePublicClient();
  if (!client) return base;
  try {
    const eventQuery = client.from("events").select("id,date,title,venue,venue_id,artist_slug").in("id", config.eventIds).eq("artist_slug", config.artistSlug).order("date");
    const eventResult = knownEvents ? { data: knownEvents, error: null } : await (config.venueId ? eventQuery.eq("venue_id", config.venueId) : eventQuery.is("venue_id", null));
    if (eventResult.error || eventResult.data?.length !== config.eventIds.length || eventResult.data.some(event => !event.date)) return base;
    base.events = eventResult.data as SeatDiscoveryEvent[];
    if (isEventPredictionEnabled(config.selectedEventId)) {
      const [read, ticketResult] = await Promise.all([
        readArenaReports(client, config.eventIds),
        client.from("event_ticket_results").select("id,event_id,result,lost_application_count,seat_type,upgrade_result", { count: "exact" })
          .in("event_id", config.eventIds).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (read.seats.error || read.external.error) return base;
      return { ...base, status: "ready", limited: read.limited,
        lottery: reportedDiscoveryLottery(base.events, ticketResult.data ?? [], ticketResult.count, Boolean(ticketResult.error)),
        reports: read.seats.data.map(report => ({ ...report, comment: null })),
        externalObservations: read.external.data.map(item => ({ ...item, source_url: null, evidence_summary: "" })),
      };
    }
    const [seatResult, externalResult, ticketResult] = await Promise.all([
      client.from("seat_reports")
        .select("id,event_id,block,row_num,seat_num,lottery_type,lottery_round,lottery_name,fc_history,payment_method,created_at", { count: "exact" })
        .in("event_id", config.eventIds).order("created_at", { ascending: false }).limit(500),
      client.from("external_seat_observations")
        .select("id,event_id,source_type,observed_at,seat_area,block,row_min,row_max,seat_min,seat_max,gate,level,confidence,review_status", { count: "exact" })
        .in("event_id", config.eventIds).eq("review_status", "approved").eq("seat_area", "arena")
        .order("observed_at", { ascending: false }).limit(500),
      client.from("event_ticket_results").select("id,event_id,result,lost_application_count,seat_type,upgrade_result", { count: "exact" }).in("event_id", config.eventIds).order("created_at", { ascending: false }).limit(1000),
    ]);
    // Errors are not an empty-data state. Never display a fabricated zero count.
    if (seatResult.error || externalResult.error) return base;
    return {
      ...base,
      status: "ready",
      lottery: reportedDiscoveryLottery(base.events, ticketResult.data ?? [], ticketResult.count, Boolean(ticketResult.error)),
      reports: (seatResult.data ?? []).map(report => ({ ...report, comment: null })) as SeatReport[],
      externalObservations: (externalResult.data ?? []).map(item => ({ ...item, source_url: null, evidence_summary: "" })) as ExternalSeatObservation[],
      limited: (seatResult.count ?? 0) > 500 || (externalResult.count ?? 0) > 500,
    };
  } catch {
    return base;
  }
}

export async function loadHomeSeatDiscovery(selected: UpcomingEvent[]): Promise<SeatDiscoveryData[]> {
  const client = createSupabasePublicClient();
  if (!client || !selected.length) return [];
  const result = await client.from("events").select("id,date,title,venue,venue_id,artist_slug", { count: "exact" }).in("artist_slug", selected.map(event => event.artistSlug)).order("date").limit(2000);
  if (result.error || !result.data || (result.count ?? 0) > result.data.length) return [];
  const events = result.data.filter(event => Boolean(event.date)) as SeatDiscoveryEvent[];
  return Promise.all(selected.filter(event => events.some(item => item.id === event.id)).map(event => {
    const group = eventSeatGroup(events, event.id);
    return loadSeatDiscovery({ artistSlug: event.artistSlug, selectedEventId: event.id, eventIds: group.map(item => item.id), venueId: group[0]?.venue_id ?? null }, group);
  }));
}
