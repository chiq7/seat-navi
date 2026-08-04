import type { CrawledEvent } from "@/lib/types";
import type { AnalyticsReport, TicketResultAnalytics, AfterReportCard } from "@/lib/artistPageTypes";

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

  const wonWithSeatType = rows.filter((r) => r.result === "won" && r.seat_type != null);
  const arenaRate = pct(
    wonWithSeatType.filter((r) => r.seat_type === "arena").length,
    wonWithSeatType.length,
  );
  const wonNonUpgrade = wonWithSeatType.filter((r) => r.upgrade_result !== "applied_won");
  const normalArenaRate = pct(
    wonNonUpgrade.filter((r) => r.seat_type === "arena").length,
    wonNonUpgrade.length,
  );
  const upgradeApplied = rows.filter(
    (r) => r.upgrade_result === "applied_lost" || r.upgrade_result === "applied_won",
  );
  const upgradeRate = pct(
    upgradeApplied.filter((r) => r.upgrade_result === "applied_won").length,
    upgradeApplied.length,
  );

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
    arenaRate,
    normalArenaRate,
    upgradeRate,
    // 各率の算出母数（信頼性の低い少数サンプルでの数値表示を避ける用途などに使う）
    normalArenaCount: wonNonUpgrade.length,
    upgradeCount: upgradeApplied.length,
  };
}

export function computeArenaDetailStats(rows: TicketResultAnalytics[]) {
  const pct = (arena: number, total: number) =>
    total > 0 ? Math.round((arena / total) * 1000) / 10 : null;
  const groupRate = (predicate: (row: TicketResultAnalytics) => boolean) => {
    const subset = rows.filter(
      (r) => r.result === "won" && r.seat_type != null && r.upgrade_result !== "applied_won" && predicate(r),
    );
    return {
      rate: pct(subset.filter((r) => r.seat_type === "arena").length, subset.length),
      total: subset.length,
    };
  };

  return {
    fc: {
      under1: groupRate((r) => r.fc_history === "1年未満"),
      one3: groupRate((r) => r.fc_history === "1〜3年"),
      over3: groupRate((r) => r.fc_history === "3年以上"),
    },
    lottery: {
      first: groupRate((r) => r.lottery_type === "1次抽選"),
      second: groupRate((r) => r.lottery_type === "2次抽選"),
      other: groupRate((r) => r.lottery_type === "その他"),
    },
    ticketCount: {
      one: groupRate((r) => r.ticket_count === 1),
      two: groupRate((r) => r.ticket_count === 2),
      three: groupRate((r) => r.ticket_count === 3),
      four: groupRate((r) => r.ticket_count === 4),
    },
    payment: {
      credit: groupRate((r) => r.payment_method === "クレカ"),
      other: groupRate((r) => r.payment_method === "その他"),
    },
  };
}

export function computeUpgradeDetailStats(rows: TicketResultAnalytics[]) {
  const pct = (won: number, total: number) =>
    total > 0 ? Math.round((won / total) * 1000) / 10 : null;
  const groupRate = (predicate: (row: TicketResultAnalytics) => boolean) => {
    const subset = rows.filter(
      (r) =>
        (r.upgrade_result === "applied_won" || r.upgrade_result === "applied_lost") &&
        predicate(r),
    );
    return {
      rate: pct(subset.filter((r) => r.upgrade_result === "applied_won").length, subset.length),
      total: subset.length,
    };
  };

  return {
    fc: {
      under1: groupRate((r) => r.fc_history === "1年未満"),
      one3:   groupRate((r) => r.fc_history === "1〜3年"),
      over3:  groupRate((r) => r.fc_history === "3年以上"),
    },
    ticketCount: {
      one:   groupRate((r) => r.ticket_count === 1),
      two:   groupRate((r) => r.ticket_count === 2),
      three: groupRate((r) => r.ticket_count === 3),
      four:  groupRate((r) => r.ticket_count === 4),
    },
    payment: {
      credit: groupRate((r) => r.payment_method === "クレカ"),
      other:  groupRate((r) => r.payment_method === "その他"),
    },
  };
}

export function computeLiveEffects(reports: AfterReportCard[]): Record<string, boolean> {
  const hasRating = (v: string | null) => v === "1" || v === "2" || v === "3" || v === "4" || v === "5";
  return {
    "center-stage": reports.some((r) => hasRating(r.center_stage)),
    "trolley": reports.some((r) => hasRating(r.torokko)),
    "aisle-walk": reports.some((r) => hasRating(r.kyakukudari)),
    "silver-tape": reports.some((r) => r.silver_tape_rows === 1),
    "fanservice": reports.some((r) => hasRating(r.fansa_rating)),
  };
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
