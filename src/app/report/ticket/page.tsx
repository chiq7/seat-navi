import { requestedPerformanceId } from "@/lib/requestedPerformance";
import { getReportOptions } from "@/lib/serverReportData";
import { TicketReport } from "./TicketReport";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: SearchParams[string]) => Array.isArray(value) ? value[0] ?? null : value ?? null;

function readInitialOptions(context: Parameters<typeof getReportOptions>[0]) {
  // Reserve time for HTML delivery when the catalog or its database fallback is slow.
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    getReportOptions(context).catch(() => undefined),
    new Promise<undefined>(resolve => { timer = setTimeout(() => resolve(undefined), 1200); }),
  ]).finally(() => clearTimeout(timer));
}

export default async function TicketReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = { event: requestedPerformanceId(params.event) ?? null, artist: first(params.artist), venue: first(params.venue) };
  const initial = await readInitialOptions(context);
  return <TicketReport key={JSON.stringify(context)} initial={initial} />;
}
