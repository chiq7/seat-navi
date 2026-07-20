/**
 * Vercel Cron 版クローラ (src/lib/eventCrawler.ts) をローカルでdry-run実行するCLI。
 * Next.js サーバーを起動せずに /api/cron/fetch-events と同じロジックを検証する。
 *
 * 実行方法:
 *   node --experimental-strip-types --env-file=.env.local \
 *     --import ./scripts/ts-loader.mjs ./scripts/dry-run-fetch-events.mts
 *
 * DB保存は一切行わない（常にdry-run）。
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { VENUES } from "@/lib/eventCrawlerConfig";
import { processVenue, sleep } from "@/lib/eventCrawler";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_API_KEY) {
  console.error("必要な環境変数が未設定です (.env.local を確認してください)");
  process.exit(1);
}

async function main() {
  const now = new Date();
  const runStart = Date.now();
  console.log("=".repeat(60));
  console.log(`dry-run-fetch-events.mts 開始: ${now.toISOString()} (JST基準時刻は eventCrawlerConfig 側でAsia/Tokyo換算)`);
  console.log("=".repeat(60));

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const claude = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let totalPlanned = 0;
  let totalExtracted = 0;
  let totalMatchedExisting = 0;
  let totalSkippedAmbiguous = 0;
  let totalInvalidDates = 0;
  const failed: string[] = [];
  const reports: Array<Record<string, unknown>> = [];

  for (const [i, venue] of VENUES.entries()) {
    console.log(`[${String(i + 1).padStart(2, "0")}/${VENUES.length}] ${venue.name} (${venue.type})`);

    if (venue.type === "disabled") {
      console.log(`  disabled: ${venue.reason}`);
      reports.push({ venueId: venue.id, venueName: venue.name, type: "disabled", skipped: true, error: venue.reason });
      continue;
    }

    const result = await processVenue(venue, claude, sb, true, now);
    // 保存予定件数には newRows のみを含める(既存一致・要確認は含めない)
    totalPlanned += result.newRows.length;
    totalExtracted += result.allEventsCount;
    totalMatchedExisting += result.matchedExisting.length;
    totalSkippedAmbiguous += result.skippedAmbiguous.length;
    totalInvalidDates += result.invalidDates.length;
    if (result.failed) failed.push(venue.name);

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
      `  会場合計: 取得試行ページ=${result.pageReports.length} / 全期間抽出=${result.allEventsCount} / ` +
      `新規保存予定=${result.newRows.length} / 既存一致=${result.matchedExisting.length} / ` +
      `要確認(複数一致)=${result.skippedAmbiguous.length} / 日付不明・無効(除外)=${result.invalidDates.length} / ` +
      `所要時間=${result.elapsedMs}ms / エラー=${result.errors.join(" | ") || "なし"}`
    );
    console.log(`  抽出タイトル一覧: ${JSON.stringify(result.rows.map((r) => r.title))}`);
    if (result.matchedExisting.length > 0) {
      console.log(`  既存一致(matched_existing): ${JSON.stringify(result.matchedExisting)}`);
    }
    if (result.skippedAmbiguous.length > 0) {
      console.log(`  要確認(skipped_ambiguous): ${JSON.stringify(result.skippedAmbiguous)}`);
    }
    if (result.invalidDates.length > 0) {
      console.log(`  日付不明・無効のため除外(invalid_date): ${JSON.stringify(result.invalidDates)}`);
    }
    if (result.multiDayExpansions.length > 0) {
      console.log(`  複数日展開: ${JSON.stringify(result.multiDayExpansions)}`);
    }

    reports.push({
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
      // 保存予定件数には newRows のみを含める(既存一致・要確認は含めない)
      plannedSaves: result.newRows.length,
      titles: result.rows.map((r) => r.title),
      // 検証用: newRowsのtitle/dateも記録する(日付形式・空白重複の独立確認のため)
      newRows: result.newRows.map((r) => ({ title: r.title, date: r.date })),
      matchedExisting: result.matchedExisting,
      skippedAmbiguous: result.skippedAmbiguous,
      invalidDatesCount: result.invalidDates.length,
      invalidDates: result.invalidDates,
      multiDayExpansions: result.multiDayExpansions,
      errors: result.errors,
      failed: result.failed,
    });

    await sleep(1500 + Math.random() * 1500);
  }

  const totalElapsedMs = Date.now() - runStart;
  console.log("=".repeat(60));
  console.log(
    `dry-run 完了: 全期間抽出合計=${totalExtracted} / 新規保存予定合計=${totalPlanned} / ` +
    `既存一致合計=${totalMatchedExisting} / 要確認(複数一致)合計=${totalSkippedAmbiguous} / ` +
    `日付不明・無効(除外)合計=${totalInvalidDates} / ` +
    `DB書き込み 0 件 / 総実行時間=${totalElapsedMs}ms (${(totalElapsedMs / 1000).toFixed(1)}秒)`
  );
  if (failed.length > 0) console.warn(`取得失敗 (${failed.length} 会場): ${failed.join(", ")}`);
  console.log("=".repeat(60));

  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const reportPath = path.join(import.meta.dirname, "fetch_events_ts_dry_run_report.json");
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        reports,
        failed,
        totalElapsedMs,
        totalExtracted,
        totalNewRows: totalPlanned,
        totalMatchedExisting,
        totalSkippedAmbiguous,
        totalInvalidDates,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`詳細レポート: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
