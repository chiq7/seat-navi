import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getJstDateString } from "@/lib/artistPageData";
import { ingestExternalSeatText } from "@/lib/external-seats/ingest";
import {
  daysUntilEventInJst,
  isAllowedOfficialResaleUrl,
  isResaleCollectionWindow,
  officialSeatText,
  robotsAllowsPath,
} from "@/lib/external-seats/sourcePolicy";
import type { ExternalSeatSource } from "@/lib/external-seats/types";

export const maxDuration = 120;
export const dynamic = "force-dynamic";
const BOT_USER_AGENT = "TixRepoSeatFactsBot/1.0 (+https://tixrepo.com/)";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
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
  const now = new Date();
  const from = getJstDateString(now);
  const to = getJstDateString(new Date(now.getTime() + 5 * 86_400_000));
  const { data, error } = await supabase
    .from("external_seat_sources")
    .select("id, event_id, source_type, source_url, active, target_date, last_fetched_at, events!inner(date)")
    .eq("active", true)
    .in("source_type", ["pia_resale", "official_resale"])
    .gte("target_date", from)
    .lte("target_date", to)
    .order("last_fetched_at", { ascending: true, nullsFirst: true })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sources = (data ?? []) as unknown as (ExternalSeatSource & { events: { date: string | null } })[];
  const results: Array<Record<string, unknown>> = [];
  const robotsByOrigin = new Map<string, { text: string } | { reason: string }>();
  for (const source of sources) {
    const eventDate = source.target_date;
    const daysUntil = daysUntilEventInJst(eventDate, now);
    if (!eventDate || eventDate !== source.events.date) {
      results.push({ sourceId: source.id, status: "skipped", reason: "公演日と巡回設定の日付が一致しません" });
      continue;
    }
    if (!isResaleCollectionWindow(eventDate, now)) {
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
            redirect: "manual",
          });
          if (robotsResponse.ok && !robotsResponse.headers.get("content-type")?.includes("text/html")) {
            robots = { text: await robotsResponse.text() };
          } else if (robotsResponse.status === 404) {
            robots = { text: "" };
          } else {
            await robotsResponse.body?.cancel();
            robots = { reason: `robots.txtを確認できません（HTTP ${robotsResponse.status}）` };
          }
        } catch {
          robots = { reason: "robots.txtを確認できません" };
        }
        robotsByOrigin.set(sourceUrl.origin, robots);
      }
      const blocked = "reason" in robots ? robots.reason
        : robotsAllowsPath(robots.text, source.source_url, BOT_USER_AGENT) ? null : "robots.txtで取得不可";
      if (blocked) {
        await supabase
          .from("external_seat_sources")
          .update({ last_fetched_at: new Date().toISOString(), last_error: blocked })
          .eq("id", source.id);
        results.push({ sourceId: source.id, status: "skipped", reason: blocked, daysUntil });
        continue;
      }
      const response = await fetch(source.source_url, {
        headers: { "user-agent": BOT_USER_AGENT },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
        redirect: "manual",
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
        text: officialSeatText(html, sourceUrl, eventDate),
        ingestionMethod: "crawler",
      });
      await supabase
        .from("external_seat_sources")
        .update({ last_fetched_at: new Date().toISOString(), last_error: null })
        .eq("id", source.id);
      results.push({
        sourceId: source.id, status: "ok", accepted: imported.accepted,
        newSeats: imported.newSeats, newArenaSeats: imported.newArenaSeats, daysUntil,
      });
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
