import { NextRequest, NextResponse } from "next/server";
import { getReportOptions } from "@/lib/serverReportData";
import { requestedPerformanceId } from "@/lib/requestedPerformance";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const options = await getReportOptions({event: requestedPerformanceId(params.getAll("event")) ?? null, venue: params.get("venue"), artist: params.get("artist")});
  return NextResponse.json(options, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
}
