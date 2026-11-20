import "server-only";
import { unstable_cache } from "next/cache";
import { getRequestPublicEventCatalog } from "./publicEventCatalogContext";
import { selectReportEvents, type ReportContext } from "./reportEventSelection";
import { applyReviewedEventDate } from "./reviewedEventDates";
import { createSupabasePublicClient } from "./supabase/public";
import { readSupabasePages } from "./supabase/readPages";
import { isTestEvent } from "./seoData";
import type { CrawledEvent } from "./types";

const loadReportEvents = unstable_cache(async () => {
  const client = createSupabasePublicClient();
  if (!client) throw new Error("Public report events unavailable");
  const result = await readSupabasePages<CrawledEvent>((from, to) => client
    .from("events").select("id,title,date,venue,venue_id,genre,artist_slug,lottery_types", { count: "exact" })
    .order("id").range(from, to), Infinity);
  if (result.error || result.limited) throw new Error("Public report events incomplete");
  return result.data.filter(row => !isTestEvent(row)).map(applyReviewedEventDate);
}, ["public-report-event-picker-v1"], { revalidate: 60, tags: ["report-events"] });

export async function getReportOptions(context: ReportContext) {
  const catalog = await getRequestPublicEventCatalog();
  return selectReportEvents(catalog?.events ?? await loadReportEvents(), context);
}
