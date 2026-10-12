import { NextRequest, NextResponse } from "next/server";
import { submitIndexNowUrls } from "@/lib/indexNow";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { urls?: unknown } | null;
  if (!body || !Array.isArray(body.urls) || !body.urls.every((url) => typeof url === "string")) {
    return NextResponse.json({ error: "urls must be a string array" }, { status: 400 });
  }

  const result = await submitIndexNowUrls(body.urls);
  return NextResponse.json({ ok: !result.error, ...result }, { status: result.error ? 502 : 200 });
}

