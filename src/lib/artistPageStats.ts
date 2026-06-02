import type { CrawledEvent } from "@/lib/types";
import type { AnalyticsReport, TicketResultAnalytics } from "@/lib/artistPageTypes";

export type PastTour = {
  title: string;
  years: string[];
  venues: string[];
  firstEventId: string;
};

export function computeSeatStats(
  reports: AnalyticsReport[],
): { normalArenaRate: number } | null {
  if (reports.length === 0) return null;

  let nonUpgradeCount = 0;
  let nonUpgradeArena = 0;

  for (const r of reports) {
    if (r.lottery_type !== "upgrade") {
      nonUpgradeCount++;
      if (/^(A|SA|SB|SC|SD|SE)\d/i.test(r.block)) nonUpgradeArena++;
    }
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
  return { normalArenaRate: pct(nonUpgradeArena, nonUpgradeCount) };
}

export function computeTicketResultStats(rows: TicketResultAnalytics[]) {
  const pct = (won: number, total: number) => (total > 0 ? Math.round((won / total) * 1000) / 10 : null);
  const buildRate = (subset: TicketResultAnalytics[]) => {
    let won = 0;
    let lost = 0;
    for (const row of subset) {
      if (row.result === "won") won++;
      lost += Math.max(0, row.lost_application_count ?? 0);
    }
    return { won, lost, total: won + lost, rate: pct(won, won + lost) };
  };
  const groupRate = (predicate: (row: TicketResultAnalytics) => boolean) =>
    buildRate(rows.filter(predicate)).rate;
  const result = buildRate(rows);

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
}

export function computeArenaDetailStats(reports: AnalyticsReport[]) {
  const normalReports = reports.filter((report) => report.lottery_type !== "upgrade");
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
}

export function computeTourInfo(
  events: CrawledEvent[],
  today: string,
  artistName: string | undefined,
): { fullTitle: string; dateRange: string | null; summary: string | null } {
  const upcoming = events
    .filter(ev => ev.date && ev.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  if (upcoming.length === 0) {
    return { fullTitle: artistName ?? "", dateRange: null, summary: null };
  }

  const stripped = upcoming.map(ev => {
    const t = ev.title;
    return t.startsWith((artistName ?? "") + " ")
      ? t.slice((artistName ?? "").length + 1)
      : t;
  });
  let common = stripped[0];
  for (const s of stripped.slice(1)) {
    while (common && !s.startsWith(common)) {
      common = common.slice(0, common.length - 1);
    }
  }
  const tourName = common.trim();
  const fullTitle = tourName ? `${artistName ?? ""} ${tourName}` : (artistName ?? "");

  const first = upcoming[0].date!;
  const last  = upcoming[upcoming.length - 1].date!;
  const fmt = (d: string) => d.replace(/-/g, ".").slice(2);
  const dateRange = first === last ? fmt(first) : `${fmt(first)} - ${fmt(last).slice(3)}`;

  const cities = new Set(upcoming.map(ev => ev.venue)).size;
  const shows  = upcoming.length;
  const summary = `${cities} Cities / ${shows} Performances`;

  return { fullTitle, dateRange, summary };
}

export function computePastTours(
  pastEvents: CrawledEvent[],
  artistName: string | undefined,
): PastTour[] {
  const tourMap = new Map<string, PastTour>();
  for (const ev of pastEvents) {
    const cleanTitle =
      ev.title
        .replace(new RegExp(`^${artistName ?? ""}\\s*`, "i"), "")
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
}
