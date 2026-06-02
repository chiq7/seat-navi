"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import type { CrawledEvent, EventTicketResult, SeatReport } from "@/lib/types";
import { buildPredictionMap } from "@/lib/seatPrediction";
import {
  getSeatPredictionExpectedBlocks,
  getSeatPredictionLayoutHints,
} from "@/lib/seatPredictionLayoutHints";
import { SeatPredictionImage } from "@/components/SeatPredictionImage";
import { SeatReportForm } from "@/components/SeatReportForm";

// 笏笏笏 Types 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

type AnalyticsReport = {
  id: string;
  event_id: string;
  block: string;
  row_num: number;
  seat_num: number;
  lottery_type: string;
  fc_history: string | null;
  payment_method?: string | null;
  created_at: string;
};

type TicketResultAnalytics = Pick<
  EventTicketResult,
  "event_id" | "result" | "lost_application_count" | "ticket_count" | "lottery_type" | "fc_history" | "payment_method"
>;

type AfterReportCard = {
  id: string;
  event_id: string;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_view_photo_paths: string[] | null;
  torokko: string | null;
  kyakukudari: string | null;
  fansa: boolean | null;
  memo: string | null;
  created_at: string;
};

type VoteResult = "won" | "lost" | "not_applied";

// 笏笏笏 Helpers 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

function fmtDate(d: string | null) {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

function photoUrl(path: string): string {
  return supabase.storage.from("after-report-photos").getPublicUrl(path).data.publicUrl;
}

function seatAreaLabel(type: string | null): string {
  const map: Record<string, string> = {
    arena: "アリーナ",
    stand_1f: "1階スタンド",
    stand_2f: "2階スタンド",
    stand_3f_or_higher: "3階以上",
    other_unknown: "その他",
  };
  return type ? (map[type] ?? type) : "不明";
}

function fmtPct(n: number): string {
  const rounded = Math.round(n);
  if (rounded === 0 && n > 0) return n.toFixed(1);
  return String(rounded);
}

// 笏笏笏 逕ｻ蜒丞ｮ壽焚 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏
// 逕ｻ蜒上′縺ｧ縺阪◆繧牙推螳壽焚繧貞ｷｮ縺玲崛縺医ｋ縺縺代〒OK
const HERO_BG = "/images/concert-hero.png";
const MENU_CARD_BG: Record<"seat" | "report" | "setlist", string | null> = {
  seat:    null, // TODO: "/images/menu-seat.png"
  report:  null, // TODO: "/images/menu-report.png"
  setlist: null, // TODO: "/images/menu-setlist.png"
};

const VENUE_TAB_ORDER = ["東京ドーム", "バンテリンドーム ナゴヤ", "京セラドーム大阪"];

const SHOW_INLINE_TICKET_SURVEY = false;

// 笏笏笏 TicketVoteCard 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

function TicketVoteCard({ slug }: { slug: string }) {
  const [myVote, setMyVote] = useState<VoteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(`seat-navi:vote:${slug}:ticket`) as VoteResult | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyVote(t);
  }, [slug]);

  async function handleVote(result: VoteResult) {
    const lsKey = `seat-navi:vote:${slug}:ticket`;
    if (localStorage.getItem(lsKey) || submitting) return;
    setSubmitting(true);
    setMyVote(result);
    localStorage.setItem(lsKey, result);
    await supabase.from("ticket_result_votes").insert({ artist_slug: slug, vote_type: "ticket", result });
    setSubmitting(false);
  }

  if (myVote) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-center text-xs text-gray-400 shadow-sm">
        チケット投票ありがとうございました
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <p className="mb-0.5 text-sm font-bold text-gray-700">チケット結果を教えてください</p>
      <p className="mb-3 text-[10px] text-gray-400">回答するとリアルタイムで反映されます</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleVote("won")}
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
          style={{ background: "#006876" }}
        >
          当選した
        </button>
        <button
          type="button"
          onClick={() => handleVote("lost")}
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 py-2.5 text-sm font-semibold text-gray-500 active:scale-95 transition-transform disabled:opacity-50"
        >
          落選した
        </button>
      </div>
    </div>
  );
}

// 笏笏笏 UpgradeVoteCard 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

function UpgradeVoteCard({ slug }: { slug: string }) {
  const [myVote, setMyVote] = useState<VoteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem(`seat-navi:vote:${slug}:upgrade`) as VoteResult | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyVote(u);
  }, [slug]);

  async function handleVote(result: VoteResult) {
    const lsKey = `seat-navi:vote:${slug}:upgrade`;
    if (localStorage.getItem(lsKey) || submitting) return;
    setSubmitting(true);
    setMyVote(result);
    localStorage.setItem(lsKey, result);
    await supabase.from("ticket_result_votes").insert({ artist_slug: slug, vote_type: "upgrade", result });
    setSubmitting(false);
  }

  if (myVote) {
    return <p className="text-center text-xs text-gray-400">アップグレード投票ありがとうございました</p>;
  }

  return (
    <div>
      <p className="mb-0.5 text-sm font-bold text-gray-700">アップグレード結果を教えてください</p>
      <p className="mb-2 text-[10px] text-gray-400">回答するとリアルタイムで反映されます</p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleVote("won")}
          disabled={submitting}
          className="flex items-center justify-center rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
        >
          当選
        </button>
        <button
          type="button"
          onClick={() => handleVote("lost")}
          disabled={submitting}
          className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 py-2.5 text-sm font-semibold text-gray-500 active:scale-95 transition-transform disabled:opacity-50"
        >
          落選
        </button>
        <button
          type="button"
          onClick={() => handleVote("not_applied")}
          disabled={submitting}
          className="flex items-center justify-center rounded-xl border border-gray-100 bg-gray-50 py-2.5 text-sm font-semibold text-gray-400 active:scale-95 transition-transform disabled:opacity-50"
        >
          未応募
        </button>
      </div>
    </div>
  );
}

// 笏笏笏 Page 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export default function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const artist = findArtistBySlug(slug);

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);
  const [ticketResultReports, setTicketResultReports] = useState<TicketResultAnalytics[]>([]);
  const [seatCounts, setSeatCounts] = useState<Map<string, number>>(new Map());
  const [afterCounts, setAfterCounts] = useState<Map<string, number>>(new Map());
  const [latestAfterReports, setLatestAfterReports] = useState<AfterReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [hasUserSelectedVenue, setHasUserSelectedVenue] = useState(false);
  const [selectedMapEventId, setSelectedMapEventId] = useState<string | null>(null);
  const [heroTicketRate, setHeroTicketRate] = useState<number | null>(null);
  const [heroUpgradeRate, setHeroUpgradeRate] = useState<number | null>(null);
  const [heroTicketCount, setHeroTicketCount] = useState(0);
  const [heroUpgradeCount, setHeroUpgradeCount] = useState(0);

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    setFetchError(null);
    const orFilter = a.keywords.map(kw => `title.ilike.%${kw}%`).join(",");

    const { data: evData, error: evError } = await supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .or(orFilter)
      .order("date", { ascending: false });

    if (evError) {
      setFetchError("公演情報を取得できませんでした。時間をおいて再度お試しください。");
      setLoading(false);
      return;
    }

    const allEvs = (evData as CrawledEvent[]) ?? [];
    setEvents(allEvs);

    if (allEvs.length === 0) { setLoading(false); return; }

    const ids = allEvs.map(e => e.id);

    const [seatRes, ticketResultRes, afterRes, latestAfterRes] = await Promise.all([
      supabase.from("seat_reports")
        .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("event_ticket_results")
        .select("event_id, result, lost_application_count, ticket_count, lottery_type, fc_history, payment_method")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("after_reports")
        .select("id, event_id")
        .in("event_id", ids),
      supabase.from("after_reports")
        .select("id, event_id, seat_area_type, seat_block, seat_row, seat_view_photo_paths, torokko, kyakukudari, fansa, memo, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const seatData = (seatRes.data as AnalyticsReport[]) ?? [];
    const ticketResultData = (ticketResultRes.data as TicketResultAnalytics[]) ?? [];
    const afterData = (afterRes.data as { id: string; event_id: string }[]) ?? [];
    const latestAfterData = (latestAfterRes.data as AfterReportCard[]) ?? [];

    const sCounts = new Map<string, number>();
    for (const r of seatData) sCounts.set(r.event_id, (sCounts.get(r.event_id) ?? 0) + 1);
    const aCounts = new Map<string, number>();
    for (const r of afterData) aCounts.set(r.event_id, (aCounts.get(r.event_id) ?? 0) + 1);

    setAnalyticsReports(seatData);
    setTicketResultReports(ticketResultData);
    setSeatCounts(sCounts);
    setAfterCounts(aCounts);
    setLatestAfterReports(latestAfterData);
    setLoading(false);
  }

  useEffect(() => {
    if (!artist) return;
    setSelectedVenue(null);
    setHasUserSelectedVenue(false);
    setSelectedMapEventId(null);
    loadData(artist);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ticket_result_votes")
        .select("vote_type, result")
        .eq("artist_slug", slug);
      if (!data) return;
      let tw = 0, tl = 0, uw = 0, ul = 0;
      for (const row of data) {
        if (row.vote_type === "ticket") {
          if (row.result === "won") tw++;
          else if (row.result === "lost") tl++;
        } else {
          if (row.result === "won") uw++;
          else if (row.result === "lost") ul++;
        }
      }
      const tt = tw + tl;
      const ut = uw + ul;
      setHeroTicketRate(tt > 0 ? Math.round((tw / tt) * 100) : null);
      setHeroUpgradeRate(ut > 0 ? Math.round((uw / ut) * 100) : null);
      setHeroTicketCount(tt);
      setHeroUpgradeCount(ut);
    })();
  }, [slug]);

  const today = new Date().toISOString().split("T")[0];

  const sortedEvents = useMemo(() => {
    const upcoming = events
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const past = events
      .filter(ev => !ev.date || ev.date < today)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const pastWithData = past.filter(ev => (seatCounts.get(ev.id) ?? 0) > 0);
    const pastNoData = past.filter(ev => (seatCounts.get(ev.id) ?? 0) === 0);
    return [...upcoming, ...pastWithData, ...pastNoData];
  }, [events, seatCounts, today]);

  const pastEvents = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date < today)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [events, today],
  );

  const venueGroups = useMemo(() => {
    const map = new Map<string, CrawledEvent[]>();
    for (const ev of sortedEvents) {
      const group = map.get(ev.venue) ?? [];
      group.push(ev);
      map.set(ev.venue, group);
    }
    return map;
  }, [sortedEvents]);

  const nearestUpcomingEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? null,
    [events, today],
  );

  const venuesSorted = useMemo(() => {
    return [...venueGroups.keys()].sort((a, b) => {
      const nearA = (venueGroups.get(a) ?? [])
        .filter(ev => ev.date && ev.date >= today)
        .sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""))[0]?.date;
      const nearB = (venueGroups.get(b) ?? [])
        .filter(ev => ev.date && ev.date >= today)
        .sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""))[0]?.date;
      if (nearA && !nearB) return -1;
      if (!nearA && nearB) return 1;
      if (nearA && nearB) return nearA.localeCompare(nearB);
      const orderA = VENUE_TAB_ORDER.indexOf(a);
      const orderB = VENUE_TAB_ORDER.indexOf(b);
      if (orderA !== -1 || orderB !== -1) {
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      }
      const latA = (venueGroups.get(a) ?? [])[0]?.date ?? "";
      const latB = (venueGroups.get(b) ?? [])[0]?.date ?? "";
      return latB.localeCompare(latA);
    });
  }, [venueGroups, today]);

  const selectedVenueHasUpcoming = selectedVenue
    ? (venueGroups.get(selectedVenue) ?? []).some(ev => ev.date && ev.date >= today)
    : false;
  const effectiveVenue =
    selectedVenue && (hasUserSelectedVenue || !nearestUpcomingEvent || selectedVenueHasUpcoming)
      ? selectedVenue
      : nearestUpcomingEvent?.venue ?? venuesSorted[0] ?? null;
  const selectedVenueEvents = useMemo(
    () => venueGroups.get(effectiveVenue ?? "") ?? [],
    [venueGroups, effectiveVenue],
  );

  const defaultVenueEvent = useMemo(() => {
    const upcoming = selectedVenueEvents
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    return (
      upcoming[0] ??
      [...selectedVenueEvents].sort((a, b) =>
        (b.date ?? "").localeCompare(a.date ?? ""),
      )[0]
    );
  }, [selectedVenueEvents, today]);

  const selectedCTAEvent = useMemo(
    () => selectedVenueEvents.find(ev => ev.id === selectedMapEventId) ?? defaultVenueEvent,
    [defaultVenueEvent, selectedMapEventId, selectedVenueEvents],
  );

  useEffect(() => {
    if (selectedVenueEvents.length === 0) {
      if (selectedMapEventId !== null) setSelectedMapEventId(null);
      return;
    }
    if (selectedMapEventId && selectedVenueEvents.some(ev => ev.id === selectedMapEventId)) return;
    setSelectedMapEventId(defaultVenueEvent?.id ?? null);
  }, [defaultVenueEvent?.id, selectedMapEventId, selectedVenueEvents]);

  const selectedVenueDateLabel = useMemo(() => {
    return selectedCTAEvent?.date ? fmtDate(selectedCTAEvent.date) : null;
  }, [selectedCTAEvent?.date]);

  const sortedSelectedVenueEvents = useMemo(
    () => {
      const upcoming = selectedVenueEvents
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      const past = selectedVenueEvents
        .filter(ev => !ev.date || ev.date < today)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      return [...upcoming, ...past];
    },
    [selectedVenueEvents, today],
  );

  const selectedSeatReports = useMemo(
    () => analyticsReports.filter(report => report.event_id === selectedCTAEvent?.id),
    [analyticsReports, selectedCTAEvent?.id],
  );

  const selectedPredictionMap = useMemo(
    () => buildPredictionMap(selectedSeatReports as SeatReport[]),
    [selectedSeatReports],
  );

  const selectedLayoutHints = useMemo(
    () =>
      selectedCTAEvent
        ? getSeatPredictionLayoutHints({
            eventId: selectedCTAEvent.id,
            venueId: selectedCTAEvent.venue_id,
          })
        : undefined,
    [selectedCTAEvent],
  );

  const selectedExpectedBlocks = useMemo(
    () =>
      selectedCTAEvent
        ? getSeatPredictionExpectedBlocks({
            eventId: selectedCTAEvent.id,
            venueId: selectedCTAEvent.venue_id,
          })
        : undefined,
    [selectedCTAEvent],
  );

  // First upcoming event for bottom nav links
  const nextEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? selectedCTAEvent,
    [events, today, selectedCTAEvent],
  );

  // Hero header info: tour name, date range, cities/performances
  const tourInfo = useMemo(() => {
    const upcoming = events
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

    if (upcoming.length === 0) {
      return { fullTitle: artist?.name ?? "", dateRange: null, summary: null };
    }

    // Derive tour name: longest common prefix of all upcoming titles, with artist name stripped
    const stripped = upcoming.map(ev => {
      const t = ev.title;
      return t.startsWith((artist?.name ?? "") + " ")
        ? t.slice((artist?.name ?? "").length + 1)
        : t;
    });
    let common = stripped[0];
    for (const s of stripped.slice(1)) {
      while (common && !s.startsWith(common)) {
        common = common.slice(0, common.length - 1);
      }
    }
    const tourName = common.trim();
    const fullTitle = tourName
      ? `${artist?.name ?? ""} ${tourName}`
      : (artist?.name ?? "");

    // Date range
    const first = upcoming[0].date!;
    const last  = upcoming[upcoming.length - 1].date!;
    const fmt = (d: string) => d.replace(/-/g, ".").slice(2); // "26.05.23"
    const dateRange = first === last ? fmt(first) : `${fmt(first)} - ${fmt(last).slice(3)}`;

    // Cities / Performances
    const cities = new Set(upcoming.map(ev => ev.venue)).size;
    const shows  = upcoming.length;
    const summary = `${cities} Cities / ${shows} Performances`;

    return { fullTitle, dateRange, summary };
  }, [events, today, artist]);

  // Group past events into tours by title
  const pastTours = useMemo(() => {
    const tourMap = new Map<
      string,
      { title: string; years: string[]; venues: string[]; firstEventId: string }
    >();
    for (const ev of pastEvents) {
      const cleanTitle =
        ev.title
          .replace(new RegExp(`^${artist?.name ?? ""}\\s*`, "i"), "")
          .trim() || ev.title;
      const year = ev.date?.split("-")[0] ?? "不明";
      const existing = tourMap.get(cleanTitle);
      if (existing) {
        if (!existing.years.includes(year)) existing.years.push(year);
        if (!existing.venues.includes(ev.venue)) existing.venues.push(ev.venue);
      } else {
        tourMap.set(cleanTitle, {
          title: cleanTitle,
          years: [year],
          venues: [ev.venue],
          firstEventId: ev.id,
        });
      }
    }
    return [...tourMap.values()].slice(0, 5);
  }, [pastEvents, artist]);

  // Compute stats from seat_reports
  const seatStats = useMemo(() => {
    const total = analyticsReports.length;
    if (total === 0) return null;

    const lotteryCount: Record<string, number> = {};
    const fcCount: Record<string, number> = {};
    let nonUpgradeCount = 0;
    let nonUpgradeArena = 0;

    for (const r of analyticsReports) {
      lotteryCount[r.lottery_type] = (lotteryCount[r.lottery_type] ?? 0) + 1;
      if (r.fc_history) fcCount[r.fc_history] = (fcCount[r.fc_history] ?? 0) + 1;
      if (r.lottery_type !== "upgrade") {
        nonUpgradeCount++;
        if (/^(A|SA|SB|SC|SD|SE)\d/i.test(r.block)) nonUpgradeArena++;
      }
    }

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

    return {
      total,
      nonUpgradeCount,
      normalArenaRate: pct(nonUpgradeArena, nonUpgradeCount),
      lotteryPct: {
        fc1: pct(lotteryCount.fc1 ?? 0, total),
        fc2: pct(lotteryCount.fc2 ?? 0, total),
        general: pct(lotteryCount.general ?? 0, total),
      },
      fcPct: {
        under1: pct(fcCount.under_1_year ?? 0, total),
        one3: pct(fcCount.one_to_three_years ?? 0, total),
        over3: pct(fcCount.over_3_years ?? 0, total),
      },
    };
  }, [analyticsReports]);

  const ticketResultStats = useMemo(() => {
    const pct = (won: number, total: number) => (total > 0 ? Math.round((won / total) * 1000) / 10 : null);
    const buildRate = (rows: TicketResultAnalytics[]) => {
      let won = 0;
      let lost = 0;
      for (const row of rows) {
        if (row.result === "won") won++;
        lost += Math.max(0, row.lost_application_count ?? 0);
      }
      return { won, lost, total: won + lost, rate: pct(won, won + lost) };
    };
    const groupRate = (predicate: (row: TicketResultAnalytics) => boolean) =>
      buildRate(ticketResultReports.filter(predicate)).rate;
    const result = buildRate(ticketResultReports);

    return {
      ...result,
      fc: {
        under1: groupRate((row) => row.fc_history === "1年未満"),
        one3: groupRate((row) => row.fc_history === "1〜3年"),
        over3: groupRate((row) => row.fc_history === "3年以上"),
      },
      ticketCount: {
        one: groupRate((row) => row.ticket_count === 1),
        two: groupRate((row) => row.ticket_count === 2),
        three: groupRate((row) => row.ticket_count === 3),
        four: groupRate((row) => row.ticket_count === 4),
      },
      lottery: {
        first: groupRate((row) => row.lottery_type === "1次抽選"),
        second: groupRate((row) => row.lottery_type === "2次抽選"),
        other: groupRate((row) => row.lottery_type === "その他"),
      },
      payment: {
        credit: groupRate((row) => row.payment_method === "クレカ"),
        other: groupRate((row) => row.payment_method === "その他"),
      },
    };
  }, [ticketResultReports]);

  const rateText = (rate: number | null) => (rate === null ? "--" : fmtPct(rate));
  const detailRateText = (rate: number | null) => (rate === null ? "--" : `${fmtPct(rate)}%`);

  const arenaDetailStats = useMemo(() => {
    const normalReports = analyticsReports.filter((report) => report.lottery_type !== "upgrade");
    const pct = (arena: number, total: number) =>
      total > 0 ? Math.round((arena / total) * 1000) / 10 : null;
    const isArena = (report: AnalyticsReport) => /^(A|SA|SB|SC|SD|SE)\d/i.test(report.block);
    const groupRate = (predicate: (report: AnalyticsReport) => boolean) => {
      const rows = normalReports.filter(predicate);
      return {
        rate: pct(rows.filter(isArena).length, rows.length),
        total: rows.length,
      };
    };

    return {
      fc: {
        under1: groupRate((report) => report.fc_history === "under_1_year"),
        one3: groupRate((report) => report.fc_history === "one_to_three_years"),
        over3: groupRate((report) => report.fc_history === "over_3_years"),
      },
      lottery: {
        first: groupRate((report) => report.lottery_type === "fc1"),
        second: groupRate((report) => report.lottery_type === "fc2"),
        other: groupRate((report) => report.lottery_type === "general"),
      },
      payment: {
        credit: groupRate((report) => report.payment_method === "credit"),
        other: groupRate((report) => report.payment_method === "other"),
      },
    };
  }, [analyticsReports]);

  // Event lookup for after-report cards
  const eventMap = useMemo(() => {
    const m = new Map<string, CrawledEvent>();
    for (const ev of events) m.set(ev.id, ev);
    return m;
  }, [events]);

  // Suppress unused warning 窶・afterCounts kept for future use
  void afterCounts;
  void heroTicketRate;
  void heroTicketCount;
  void heroUpgradeCount;

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
        <Link
          href="/"
          className="rounded-full px-5 py-2.5 text-xs font-bold text-white"
          style={{ background: "#006876" }}
        >
          ホームに戻る
        </Link>
      </div>
    );
  }

  const afterHref = nextEvent ? `/events/${nextEvent.id}/after-report` : "#";

  return (
    <div className="min-h-screen" style={{ background: "#e8edf0" }}>
      <div
        className="mx-auto w-full max-w-[430px] min-h-screen relative shadow-2xl"
        style={{ background: "#f3f6f8" }}
      >

        {/* Header */}
        <header
          className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex justify-between items-center px-4 h-14"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-transform"
            style={{ background: "rgba(0,104,118,0.06)" }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold tracking-tight" style={{ color: "#006876" }}>
            {artist.name}
          </h1>
          <div className="w-9" />
        </header>

        <main className="pt-14 pb-24">

          {/* 1. Hero Card */}
          <section className="mx-4 mt-3">
            <div
              className="relative h-[148px] overflow-hidden rounded-2xl"
              style={{
                backgroundImage: `url('${HERO_BG}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: "#0a0e1a",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(ellipse 75% 55% at 38% 28%, rgba(0,104,118,0.52) 0%, transparent 52%),
                    radial-gradient(ellipse 52% 40% at 72% 18%, rgba(6,182,212,0.38) 0%, transparent 44%),
                    linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)
                  `,
                }}
              />
              <div className="absolute inset-0 flex flex-col justify-end px-4 pb-4">
                <span className="mb-1.5 w-fit rounded-full border border-white/40 bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                  Live Announcement
                </span>
                <h2
                  className="text-[14px] font-bold leading-snug text-white"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
                >
                  {tourInfo.fullTitle || artist.name}
                </h2>
                {tourInfo.dateRange && (
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-white/70">
                    <span>{tourInfo.dateRange}</span>
                    {tourInfo.summary && (
                      <>
                        <span className="text-white/40">|</span>
                        <span>{tourInfo.summary}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          </section>

          {fetchError && (
            <div className="mx-4 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {fetchError}
            </div>
          )}

          {/* 2. 繝｡繧､繝ｳ繝｡繝九Η繝ｼ 3繧ｫ繝ｼ繝・*/}
          <section className="px-4 pt-3">
            <div className="mb-2.5 flex justify-center">
              <span
                className="rounded-full px-4 py-1 text-xs font-bold tracking-wide"
                style={{ background: "rgba(0,104,118,0.1)", color: "#006876" }}
              >
                メインメニュー
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">

              {/* 繧｢繝ｪ繝ｼ繝雁ｱ蜻翫・繝・・ */}
              {selectedCTAEvent ? (
                <Link
                  href={`/events/${selectedCTAEvent.id}`}
                  className="relative overflow-hidden rounded-2xl border border-gray-200/70 shadow-md transition-transform active:scale-[0.97]"
                  style={{ height: "96px" }}
                >
                  {/* 閭梧勹: 逕ｻ蜒上′縺ゅｌ縺ｰ陦ｨ遉ｺ縲√↑縺代ｌ縺ｰ莉ｮ繧ｰ繝ｩ繝・・繧ｷ繝ｧ繝ｳ */}
                  <div
                    className="absolute inset-0"
                    style={
                      MENU_CARD_BG.seat
                        ? { backgroundImage: `url('${MENU_CARD_BG.seat}')`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { background: "linear-gradient(145deg, #00545f 0%, #006876 100%)" }
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <p className="text-xs font-bold leading-tight text-white">アリーナ報告</p>
                    <p className="text-[10px] text-white/70">見る・報告</p>
                  </div>
                </Link>
              ) : (
                <div
                  className="relative overflow-hidden rounded-2xl border border-gray-200/70 opacity-50 shadow-md"
                  style={{ height: "96px" }}
                >
                  <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #00545f 0%, #006876 100%)" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <p className="text-xs font-bold leading-tight text-white">アリーナ報告</p>
                    <p className="text-[10px] text-white/70">見る・報告</p>
                  </div>
                </div>
              )}

              {/* 迴ｾ蝨ｰ繝ｬ繝・*/}
              <Link
                href={afterHref}
                className="relative overflow-hidden rounded-2xl border border-gray-200/70 shadow-md transition-transform active:scale-[0.97]"
                style={{ height: "96px" }}
              >
                <div
                  className="absolute inset-0"
                  style={
                    MENU_CARD_BG.report
                      ? { backgroundImage: `url('${MENU_CARD_BG.report}')`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { background: "linear-gradient(145deg, #005869 0%, #006876 100%)" }
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="text-xs font-bold leading-tight text-white">現地レポ</p>
                  <p className="text-[10px] text-white/70">見る・報告</p>
                </div>
              </Link>

              {/* 繧ｻ繝医Μ */}
              <Link
                href={`/artists/${slug}/setlist`}
                className="relative overflow-hidden rounded-2xl border border-gray-200/70 shadow-md transition-transform active:scale-[0.97]"
                style={{ height: "96px" }}
              >
                <div
                  className="absolute inset-0"
                  style={
                    MENU_CARD_BG.setlist
                      ? { backgroundImage: `url('${MENU_CARD_BG.setlist}')`, backgroundSize: "cover", backgroundPosition: "center" }
                      : { background: "linear-gradient(145deg, #3b1fa3 0%, #5B2BE0 100%)" }
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="text-xs font-bold leading-tight text-white">セトリ</p>
                  <p className="text-[10px] text-white/70">見る・報告</p>
                </div>
              </Link>

            </div>
          </section>

          {/* 3. アリーナ報告マップ */}
          <section className="mt-5 px-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              アリーナ報告マップ
            </h3>
            <div className="overflow-hidden rounded-2xl bg-white">
              {/* 莨壼ｴ繧ｿ繝・*/}
              {venuesSorted.length > 1 && (
                <div className="border-b border-gray-100 p-3" style={{ background: "rgba(243,246,248,0.6)" }}>
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {venuesSorted.map(venue => {
                      const isSel = venue === effectiveVenue;
                      return (
                        <button
                          key={venue}
                          type="button"
                          onClick={() => {
                            setHasUserSelectedVenue(true);
                            setSelectedVenue(venue);
                            setSelectedMapEventId(null);
                          }}
                          className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95"
                          style={
                            isSel
                              ? { background: "#006876", color: "#fff" }
                              : { background: "#e2e8ea", color: "#4b6870" }
                          }
                        >
                          {venue}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sortedSelectedVenueEvents.length > 0 && (
                <div className="border-b border-gray-100 px-3 py-2" style={{ background: "rgba(243,246,248,0.42)" }}>
                  <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {sortedSelectedVenueEvents.map(ev => {
                      const isSel = ev.id === selectedCTAEvent?.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelectedMapEventId(ev.id)}
                          className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-all active:scale-95"
                          style={
                            isSel
                              ? { background: "#006876", color: "#fff" }
                              : { background: "#edf3f4", color: "#4b6870" }
                          }
                        >
                          {fmtDate(ev.date)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                if (loading) {
                  return (
                    <div className="flex aspect-[4/3] items-center justify-center">
                      <div
                        className="h-6 w-6 animate-spin rounded-full border-2"
                        style={{ borderColor: "#006876", borderTopColor: "transparent" }}
                      />
                    </div>
                  );
                }
                if (!selectedCTAEvent) {
                  return (
                    <div className="flex aspect-[4/3] items-center justify-center">
                      <p className="text-xs text-gray-400">公演情報がありません</p>
                    </div>
                  );
                }
                return (
                  <Link href={`/events/${selectedCTAEvent.id}`} className="group block">
                    <div className="bg-white">
                      <SeatPredictionImage
                        prediction={selectedPredictionMap}
                        layoutHints={selectedLayoutHints}
                        expectedBlocks={selectedExpectedBlocks}
                        variant="compact"
                        compactVenueName={effectiveVenue}
                        compactDateLabel={selectedVenueDateLabel}
                      />
                    </div>
                    <div className="px-1 pt-2 pb-1">
                      <div
                        className="flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold text-white transition-transform active:scale-[0.98]"
                        style={{ background: "#006876" }}
                      >
                        みんなの予想を見る
                      </div>
                    </div>
                  </Link>
                );
              })()}
            </div>
            {selectedCTAEvent && (
              <div id="seat-report" className="mt-3">
                <SeatReportForm
                  eventId={selectedCTAEvent.id}
                  event={selectedCTAEvent}
                  successMode="inline"
                  variant="progressive"
                />
              </div>
            )}
          </section>

          {/* 4. 蠖馴∈邇・ョ繝ｼ繧ｿ */}
          <section className="mt-5 px-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              当選率データ
            </h3>

            {SHOW_INLINE_TICKET_SURVEY && (
              <div className="mb-3">
                <TicketVoteCard slug={slug} />
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "チケット当選率",
                    value: rateText(ticketResultStats.rate),
                    unit: "%",
                    note: `落選報告を含む / n=${ticketResultStats.total}`,
                    color: "#006876",
                  },
                  {
                    label: "通常当選アリーナ率",
                    value: seatStats ? fmtPct(seatStats.normalArenaRate) : "--",
                    unit: "%",
                    note: `seat_reports / n=${seatStats?.nonUpgradeCount ?? 0}`,
                    color: "#006876",
                  },
                  {
                    label: "アプグレ当選率",
                    value: heroUpgradeRate !== null ? String(heroUpgradeRate) : "--",
                    unit: "%",
                    note: `既存投票 / n=${heroUpgradeCount}`,
                    color: "#f59e0b",
                  },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
                    <p className="mb-1 text-[11px] font-bold text-gray-500">{card.label}</p>
                    <div className="flex items-end justify-center gap-0.5">
                      <span className="text-3xl font-bold leading-none" style={{ color: card.color }}>
                        {card.value}
                      </span>
                      {card.value !== "--" && (
                        <span className="mb-0.5 text-sm font-bold" style={{ color: card.color }}>
                          {card.unit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <p className="mb-2.5 text-sm font-semibold" style={{ color: "#006876" }}>主要傾向</p>
                <div className="space-y-3">
                  {[
                    {
                      label: "FC歴別 チケット当選率",
                      items: [
                        ["1年未満", rateText(ticketResultStats.fc.under1)],
                        ["1〜3年", rateText(ticketResultStats.fc.one3)],
                        ["3年以上", rateText(ticketResultStats.fc.over3)],
                      ],
                      cols: "grid-cols-3",
                    },
                    {
                      label: "申込枚数別 チケット当選率",
                      items: [
                        ["1枚", rateText(ticketResultStats.ticketCount.one)],
                        ["2枚", rateText(ticketResultStats.ticketCount.two)],
                        ["3枚", rateText(ticketResultStats.ticketCount.three)],
                        ["4枚", rateText(ticketResultStats.ticketCount.four)],
                      ],
                      cols: "grid-cols-4",
                    },
                    {
                      label: "抽選回別 チケット当選率",
                      items: [
                        ["1次抽選", rateText(ticketResultStats.lottery.first)],
                        ["2次抽選", rateText(ticketResultStats.lottery.second)],
                        ["その他", rateText(ticketResultStats.lottery.other)],
                      ],
                      cols: "grid-cols-3",
                    },
                    {
                      label: "決済方法別 チケット当選率",
                      items: [
                        ["クレカ", rateText(ticketResultStats.payment.credit)],
                        ["その他", rateText(ticketResultStats.payment.other)],
                      ],
                      cols: "grid-cols-2",
                    },
                  ].map((group) => (
                    <div key={group.label}>
                      <p className="mb-1 border-b border-slate-100 pb-0.5 text-[11px] font-bold text-gray-400">
                        {group.label}
                      </p>
                      <div className={`grid ${group.cols} gap-1.5 text-center`}>
                        {group.items.map(([label, val]) => (
                          <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                            <p className="mb-0.5 text-[10px] text-gray-400">{label}</p>
                            <p className="text-sm font-bold" style={{ color: "#006876" }}>
                              {val === "--" ? val : `${val}%`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {SHOW_INLINE_TICKET_SURVEY && (
                <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <UpgradeVoteCard slug={slug} />
                </div>
              )}
            </div>
          </section>

          <section className="mt-5 px-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 3a1 1 0 012 0v2.06a8.001 8.001 0 016.94 6.94H22a1 1 0 110 2h-2.06A8.001 8.001 0 0113 20.94V23a1 1 0 11-2 0v-2.06A8.001 8.001 0 014.06 14H2a1 1 0 110-2h2.06A8.001 8.001 0 0111 5.06V3z" />
              </svg>
              詳細傾向
            </h3>

            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <p className="mb-2.5 text-sm font-semibold" style={{ color: "#006876" }}>アリーナ当選率</p>
                <div className="space-y-3">
                  {[
                    {
                      label: "FC歴別",
                      items: [
                        ["1年未満", arenaDetailStats.fc.under1.rate, arenaDetailStats.fc.under1.total],
                        ["1〜3年", arenaDetailStats.fc.one3.rate, arenaDetailStats.fc.one3.total],
                        ["3年以上", arenaDetailStats.fc.over3.rate, arenaDetailStats.fc.over3.total],
                      ],
                      cols: "grid-cols-3",
                    },
                    {
                      label: "抽選回別",
                      items: [
                        ["1次抽選", arenaDetailStats.lottery.first.rate, arenaDetailStats.lottery.first.total],
                        ["2次抽選", arenaDetailStats.lottery.second.rate, arenaDetailStats.lottery.second.total],
                        ["その他", arenaDetailStats.lottery.other.rate, arenaDetailStats.lottery.other.total],
                      ],
                      cols: "grid-cols-3",
                    },
                    {
                      label: "申込枚数別",
                      items: [
                        ["1枚", null, 0],
                        ["2枚", null, 0],
                        ["3枚", null, 0],
                        ["4枚", null, 0],
                      ],
                      cols: "grid-cols-4",
                    },
                  ].map((group) => (
                    <div key={group.label}>
                      <p className="mb-1 border-b border-slate-100 pb-0.5 text-[11px] font-bold text-gray-400">
                        {group.label}
                      </p>
                      <div className={`grid ${group.cols} gap-1.5 text-center`}>
                        {group.items.map(([label, rate, total]) => (
                          <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                            <p className="mb-0.5 text-[10px] text-gray-400">{label}</p>
                            <p className="text-sm font-bold" style={{ color: "#006876" }}>
                              {detailRateText(rate as number | null)}
                            </p>
                            <p className="text-[9px] font-semibold text-gray-300">n={total}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* 5. 譛譁ｰ縺ｮ迴ｾ蝨ｰ繝ｬ繝・*/}
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between px-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                最新の現地レポ
              </h3>
              <Link
                href={afterHref}
                className="text-xs font-semibold"
                style={{ color: "#006876" }}
              >
                すべて見る
              </Link>
            </div>

            {latestAfterReports.length > 0 ? (
              <div
                className="flex gap-3 overflow-x-auto pb-2 px-4"
                style={{ scrollbarWidth: "none" }}
              >
                {latestAfterReports.map(report => {
                  const ev = eventMap.get(report.event_id);
                  const thumb = report.seat_view_photo_paths?.[0];
                  const thumbUrl = thumb ? photoUrl(thumb) : null;

                  return (
                    <Link
                      key={report.id}
                      href={afterHref}
                      className="min-w-[260px] snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm active:scale-[0.98] transition-transform"
                    >
                      <div className="relative aspect-video bg-gray-100">
                        {thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {ev?.date && (
                          <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                            {fmtDate(ev.date)} {ev.venue}
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {report.torokko === "yes" && (
                            <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              トロッコ
                            </span>
                          )}
                          {report.kyakukudari === "yes" && (
                            <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              客降り
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-bold" style={{ color: "#006876" }}>
                          {seatAreaLabel(report.seat_area_type)}
                          {report.seat_block ? ` ${report.seat_block}` : ""}
                          {report.seat_row ? ` ${report.seat_row}列` : ""}
                        </p>
                        {report.memo && (
                          <p className="mt-1 line-clamp-1 text-xs text-gray-500">{report.memo}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {report.fansa === true && (
                            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              ファンサ
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mx-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-400">現地レポートはまだありません</p>
                <Link
                  href={afterHref}
                  className="mt-3 inline-block rounded-xl px-5 py-2.5 text-xs font-bold text-white"
                  style={{ background: "#006876" }}
                >
                  最初のレポートを投稿する
                </Link>
              </div>
            )}
          </section>

          {/* 6. 繧ｻ繝医Μ繝ｻ譖ｲ鬆・*/}
          <section id="section-setlist" className="mt-5 px-4 scroll-mt-16">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              セトリ・曲順
            </h3>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-red-500">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                ネタバレを含む可能性があります
              </p>
              <div className="space-y-2.5">
                <Link
                  href={`/artists/${slug}/setlist`}
                  className="block w-full rounded-xl border-2 py-3.5 text-center text-sm font-semibold active:scale-[0.98] transition-transform"
                  style={{ borderColor: "#006876", color: "#006876" }}
                >
                  セトリを見る
                </Link>
                <Link
                  href={`/artists/${slug}/setlist`}
                  className="block w-full rounded-xl bg-gray-100 py-3.5 text-center text-sm font-semibold text-gray-600 active:scale-[0.98] transition-transform"
                >
                  セトリを投稿する
                </Link>
              </div>
            </div>
          </section>

          {/* 7. 驕主悉蜈ｬ貍斐ョ繝ｼ繧ｿ */}
          <section className="mt-5 px-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              過去公演データ
            </h3>
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {!loading && pastTours.length > 0 ? (
                pastTours.map((tour, i) => (
                  <Link
                    key={tour.firstEventId}
                    href={`/events/${tour.firstEventId}`}
                    className={`flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors group ${
                      i < pastTours.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: "#006876" }}>
                        {[...tour.years].sort().join("・")}
                      </p>
                      <h4 className="mt-0.5 line-clamp-1 text-sm font-semibold text-gray-800">
                        {tour.title}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {tour.venues.slice(0, 3).join(" ﾂｷ ")}
                        {tour.venues.length > 3 ? " 他" : ""}
                      </p>
                    </div>
                    <svg
                      className="ml-2 h-4 w-4 shrink-0 text-gray-300 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-400">
                    {loading ? "読み込み中..." : "過去公演データなし"}
                  </p>
                </div>
              )}
            </div>
          </section>

        </main>

        {/* 繝懊ヨ繝繝翫ン 窶・4蛻・牡 */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 border-t border-gray-100"
          style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] font-semibold" style={{ color: "#006876" }}>集計まとめ</span>
            </button>

            <Link
              href={selectedCTAEvent ? `/events/${selectedCTAEvent.id}` : "#"}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-500">座席予想</span>
            </Link>

            <Link href={afterHref} className="flex flex-col items-center gap-0.5 px-4 py-1.5">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-500">現地レポ</span>
            </Link>

            <Link
              href={`/artists/${slug}/setlist`}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-500">セトリ</span>
            </Link>
          </div>
        </nav>

      </div>
    </div>
  );
}
