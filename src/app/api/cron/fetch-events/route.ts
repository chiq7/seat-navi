/**
 * /api/cron/fetch-events
 * Vercel Cron Job から週1回呼ばれるハンドラー。
 * 各会場スケジュールページをフェッチ → Claude API でコンサート/ライブを抽出 → Supabase upsert。
 *
 * クロール本体のロジックは src/lib/eventCrawler.ts / eventCrawlerConfig.ts にあり、
 * scripts/dry-run-fetch-events.ts (ローカルdry-run用CLI) と共有している。
 *
 * 必要な環境変数:
 *   ANTHROPIC_API_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   CRON_SECRET  (Vercel Cron が自動で Authorization: Bearer <secret> を付与)
 *
 * Pro プランで maxDuration=300 が有効になります。Hobby プランでは 60 秒制限あり。
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { VENUES } from "@/lib/eventCrawlerConfig";
import { processVenue, sleep } from "@/lib/eventCrawler";
import { submitIndexNowUrls } from "@/lib/indexNow";
import { syncOfficialTourSources } from "@/lib/officialTourSources";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron の認証チェック
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const dryRun = ["1", "true"].includes(req.nextUrl.searchParams.get("dryRun")?.toLowerCase() ?? "");

  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    return NextResponse.json({ error: "必要な環境変数が未設定です" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey);
  const claude = new Anthropic({ apiKey: anthropicKey });
  const now = new Date();
  const runStart = Date.now();

  let totalSaved = 0;
  let totalExtracted = 0;
  let totalNewRows = 0;
  let totalMatchedExisting = 0;
  let totalSkippedAmbiguous = 0;
  let totalSkippedSameSlotCandidates = 0;
  let totalInvalidDates = 0;
  const failed: string[] = [];
  const reports: Array<Record<string, unknown>> = [];
  const indexNowUrls = new Set<string>();

  console.log(`=== fetch-events cron 開始: ${now.toISOString()} / dry-run=${dryRun} ===`);

  for (const venue of VENUES) {
    if (venue.type === "disabled") {
      const report = {
        venueId: venue.id,
        venueName: venue.name,
        type: venue.type,
        skipped: true,
        error: venue.reason,
      };
      reports.push(report);
      console.log(`[${venue.name}] disabled / 理由=${venue.reason}`);
      continue;
    }

    const result = await processVenue(venue, claude, sb, dryRun, now);
    totalSaved += result.saved;
    totalExtracted += result.allEventsCount;
    totalNewRows += result.newRows.length;
    totalMatchedExisting += result.matchedExisting.length;
    totalSkippedAmbiguous += result.skippedAmbiguous.length;
    totalSkippedSameSlotCandidates += result.skippedSameSlotCandidates.length;
    totalInvalidDates += result.invalidDates.length;
    if (result.failed) failed.push(venue.name);
    if (!dryRun && result.saved > 0) {
      for (const row of result.newRows) {
        indexNowUrls.add(`https://tixrepo.com/events/${row.id}`);
        indexNowUrls.add(`https://tixrepo.com/venues/${row.venue_id}`);
        if (row.artist_slug) indexNowUrls.add(`https://tixrepo.com/artists/${row.artist_slug}`);
      }
      indexNowUrls.add("https://tixrepo.com/");
      indexNowUrls.add("https://tixrepo.com/sitemap.xml");
    }

    for (const r of result.pageReports) {
      const p = r.page;
      const monthLabel = p.year ? `${p.year}-${String(p.month).padStart(2, "0")}` : "-";
      const claudeSuffix = r.elapsedMs ? ` (抽出${r.elapsedMs}ms)` : "";
      console.log(
        `    [${monthLabel}] ${p.url} HTTP=${p.status} (${p.elapsedMs}ms) 文字数=${p.chars} → ${r.statusLabel}${claudeSuffix}`
      );
    }
    if (result.unreachableMonths.length > 0) {
      const labels = result.unreachableMonths.map((m) => `${m.year}-${String(m.month).padStart(2, "0")}`).join(", ");
      console.log(`    未取得月(サイト未掲載): ${labels}`);
    }

    console.log(
      `[${venue.name}] 取得試行ページ=${result.pageReports.length} / 全期間抽出=${result.allEventsCount} / ` +
      `新規保存予定=${result.newRows.length} / 既存一致=${result.matchedExisting.length} / ` +
      `要確認(既存一致)=${result.skippedAmbiguous.length} / 要確認(同枠候補)=${result.skippedSameSlotCandidates.length} / DB保存=${result.saved} / ` +
      `所要時間=${result.elapsedMs}ms / エラー=${result.errors.join(" | ") || "なし"}`
    );

    const report = {
      venueId: venue.id,
      venueName: venue.name,
      type: venue.type,
      elapsedMs: result.elapsedMs,
      pages: result.pageReports.map((r) => ({
        url: r.page.url,
        year: r.page.year,
        month: r.page.month,
        status: r.page.status,
        chars: r.page.chars,
        fetchElapsedMs: r.page.elapsedMs,
        claudeResult: r.statusLabel,
        claudeElapsedMs: r.elapsedMs,
      })),
      unreachableMonths: result.unreachableMonths.map((m) => `${m.year}-${String(m.month).padStart(2, "0")}`),
      extractedCount: result.allEventsCount,
      newRowsCount: result.newRows.length,
      matchedExistingCount: result.matchedExisting.length,
      skippedAmbiguousCount: result.skippedAmbiguous.length,
      skippedSameSlotCandidatesCount: result.skippedSameSlotCandidates.length,
      titles: result.rows.map((row) => row.title),
      matchedExisting: result.matchedExisting,
      skippedAmbiguous: result.skippedAmbiguous,
      skippedSameSlotCandidates: result.skippedSameSlotCandidates,
      invalidDatesCount: result.invalidDates.length,
      invalidDates: result.invalidDates,
      multiDayExpansions: result.multiDayExpansions,
      artistAssociations: result.artistAssociations,
      // 保存予定件数には newRows のみを含める(既存一致・要確認・invalidDatesは含めない)
      plannedSaves: dryRun ? result.newRows.length : undefined,
      dbSaved: result.saved,
      errors: result.errors,
      failed: result.failed,
    };
    reports.push(report);

    await sleep(2500 + Math.random() * 2000);
  }

  // 会場カレンダーでは短縮タイトルになりやすいため、アーティスト公式のツアー詳細で補正する。
  // 既存公演は日付・会場・アーティストが一致するものだけ更新し、別公演は保留する。
  const officialTourReports = await syncOfficialTourSources(sb, dryRun);
  for (const report of officialTourReports) {
    if (report.error) failed.push(`公式ツアー情報:${report.sourceId}`);
    totalSaved += report.created + report.updated;
    totalNewRows += report.created;
    if (!dryRun && (report.created > 0 || report.updated > 0)) {
      indexNowUrls.add("https://tixrepo.com/");
      indexNowUrls.add(`https://tixrepo.com/artists/${report.artistSlug}`);
      indexNowUrls.add("https://tixrepo.com/sitemap.xml");
    }
  }

  const totalElapsedMs = Date.now() - runStart;
  const maxDurationWarning =
    totalElapsedMs > maxDuration * 1000 * 0.9
      ? `実行時間が maxDuration=${maxDuration}秒に対して ${(totalElapsedMs / 1000).toFixed(1)}秒でした。超過リスクがあるため会場分割等の対策を検討してください（自動分割はしていません）。`
      : null;

  console.log(`=== 完了: ${totalSaved} 件保存, 失敗: ${failed.join(", ") || "なし"} / 総実行時間=${totalElapsedMs}ms ===`);
  if (maxDurationWarning) console.warn(maxDurationWarning);

  const indexNow = dryRun
    ? { submitted: 0, status: null, error: null }
    : await submitIndexNowUrls([...indexNowUrls]);
  if (indexNow.error) {
    console.warn(`IndexNow通知に失敗しました（公演保存は成功扱いを維持）: ${indexNow.error}`);
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    totalSaved,
    totalExtracted,
    totalNewRows,
    totalMatchedExisting,
    totalSkippedAmbiguous,
    totalSkippedSameSlotCandidates,
    totalInvalidDates,
    officialTourReports,
    failed,
    reports,
    totalElapsedMs,
    maxDurationWarning,
    indexNow,
    processedAt: new Date().toISOString(),
  });
}
