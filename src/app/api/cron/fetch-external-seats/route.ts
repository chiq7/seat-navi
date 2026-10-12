import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ingestExternalSeatText } from "@/lib/external-seats/ingest";
import {
  daysUntilEventInJst,
  htmlToVisibleText,
  isAllowedOfficialResaleUrl,
  isResaleCollectionWindow,
  robotsAllowsPath,
} from "@/lib/external-seats/sourcePolicy";
import type { ExternalSeatSource } from "@/lib/external-seats/types";

export const maxDuration = 120;
export const dynamic = "force-dynamic";
const BOT_USER_AGENT = "TixRepoSeatFactsBot/1.0 (+https://tixrepo.com/)";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabaseのサーバー環境変数が未設定です" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("external_seat_sources")
    .select("id, event_id, source_type, source_url, active, target_date, last_fetched_at")
    .eq("active", true)
    .order("last_fetched_at", { ascending: true, nullsFirst: true })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sources = (data ?? []) as ExternalSeatSource[];
  const results: Array<Record<string, unknown>> = [];
  const robotsByOrigin = new Map<string, { allowed: boolean; reason?: string }>();
  for (const source of sources) {
    const eventDate = source.target_date;
    const daysUntil = daysUntilEventInJst(eventDate);
    if (!isResaleCollectionWindow(eventDate)) {
      results.push({ sourceId: source.id, status: "skipped", reason: "巡回対象期間外", daysUntil });
      continue;
    }
    if (!isAllowedOfficialResaleUrl(source.source_url)) {
      results.push({ sourceId: source.id, status: "skipped", reason: "許可対象外のドメイン" });
      continue;
    }
    try {
      const sourceUrl = new URL(source.source_url);
      let robots = robotsByOrigin.get(sourceUrl.origin);
      if (!robots) {
        try {
          const robotsResponse = await fetch(`${sourceUrl.origin}/robots.txt`, {
            headers: { "user-agent": BOT_USER_AGENT },
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
          });
          if (robotsResponse.ok) {
            robots = robotsAllowsPath(await robotsResponse.text(), source.source_url, BOT_USER_AGENT)
              ? { allowed: true }
              : { allowed: false, reason: "robots.txtで取得不可" };
          } else if (robotsResponse.status === 404) {
            robots = { allowed: true };
          } else {
            robots = { allowed: false, reason: `robots.txt HTTP ${robotsResponse.status}` };
          }
        } catch {
          robots = { allowed: false, reason: "robots.txtを確認できません" };
        }
        robotsByOrigin.set(sourceUrl.origin, robots);
      }
      if (!robots.allowed) {
        await supabase
          .from("external_seat_sources")
          .update({ last_fetched_at: new Date().toISOString(), last_error: robots.reason })
          .eq("id", source.id);
        results.push({ sourceId: source.id, status: "skipped", reason: robots.reason, daysUntil });
        continue;
      }
      const response = await fetch(source.source_url, {
        headers: { "user-agent": BOT_USER_AGENT },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > 2_000_000) throw new Error("ページサイズが上限を超えています");
      const html = await response.text();
      if (html.length > 2_000_000) throw new Error("ページサイズが上限を超えています");
      const imported = await ingestExternalSeatText({
        supabase,
        eventId: source.event_id,
        sourceType: source.source_type,
        sourceUrl: source.source_url,
        text: htmlToVisibleText(html),
        ingestionMethod: "crawler",
      });
      await supabase
        .from("external_seat_sources")
        .update({ last_fetched_at: new Date().toISOString(), last_error: null })
        .eq("id", source.id);
      results.push({ sourceId: source.id, status: "ok", accepted: imported.accepted, daysUntil });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.slice(0, 300) : "取得失敗";
      await supabase
        .from("external_seat_sources")
        .update({ last_fetched_at: new Date().toISOString(), last_error: message })
        .eq("id", source.id);
      results.push({ sourceId: source.id, status: "error", error: message });
    }
  }

  return NextResponse.json({ processed: sources.length, results });
}
