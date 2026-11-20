import { ReportEntryClient } from "./ReportEntryClient";
import { getReportOptions } from "@/lib/serverReportData";
import { requestedPerformanceId } from "@/lib/requestedPerformance";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: SearchParams[string]) => Array.isArray(value) ? value[0] ?? null : value ?? null;

export default async function ReportEntryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = { event: requestedPerformanceId(params.event) ?? null, artist: first(params.artist), venue: first(params.venue) };
  const initial = await getReportOptions(context).catch(() => undefined);
  return <ReportEntryClient key={JSON.stringify(context)} initial={initial} />;
}
