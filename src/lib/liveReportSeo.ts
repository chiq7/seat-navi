type ReportEventIdentity = { title: string; date: string | null };

function hasKnownReportDate(event: ReportEventIdentity) {
  return Boolean(event.date && !/開催日未確認|日程未定/.test(event.title));
}

export function canIndexLiveReport(event: ReportEventIdentity, artistName: string | null | undefined, isTestData: boolean) {
  return Boolean(!isTestData && artistName?.trim() && hasKnownReportDate(event));
}

export function liveReportTitle(event: ReportEventIdentity & { venue: string }, artistName: string | null, dateLabel: string) {
  const subject = [artistName?.trim(), event.venue.trim()].filter(Boolean).join("・");
  const date = hasKnownReportDate(event) ? `（${dateLabel}）` : "";
  return `${subject ? subject + "の" : ""}現地レポ${date}｜ちけレポ`;
}
