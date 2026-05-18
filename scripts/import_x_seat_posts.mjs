/**
 * Grok CSV → x_seat_posts テーブル 取り込みスクリプト
 *
 * 使い方:
 *   node scripts/import_x_seat_posts.mjs <CSVパス> [--dry-run]
 *
 * オプション:
 *   --dry-run  変換結果のみ表示。DBへの書き込みは行わない。
 *
 * 必須カラム (CSVヘッダー):
 *   artist_name, venue_name, post_type
 *
 * post_type に使える値:
 *   prediction / result / after_report / unknown
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Supabase 接続情報（service_role）
// ---------------------------------------------------------------------------

const SUPABASE_URL     = "https://sibjmyabcwpojtzbnqnc.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYmpteWFiY3dwb2p0emJucW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIyNTY5NCwiZXhwIjoyMDkyODAxNjk0fQ.fbbb6wVJh4FNHmKOMC1yAUYP4jgNQRZwRovOhnQ9NiE";

const VALID_POST_TYPES = new Set(["prediction", "result", "after_report", "unknown"]);
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// CSVパーサー（クォート付きフィールド対応）
// ---------------------------------------------------------------------------

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 変換ユーティリティ
// ---------------------------------------------------------------------------

/** 空文字列を null に変換 */
function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// ブロック列に入れない値（「不明」系のプレースホルダー）
const BLOCK_PLACEHOLDER = new Set(["不明", "不明確", "unknown", "-", "—", "tbd"]);

// 説明文と判断するパターン（ブロック名ではない）
// 例: "花道沿いブロック" "沿って" など、会場構造物に対する位置説明
const BLOCK_DESC_PATTERN = /沿い|沿って|付近の|方向の/;

/**
 * 全角・半角の括弧内説明文を除去する
 * 例: "A前半（ピンクエリア）" → "A前半"
 */
function stripParens(s) {
  return s.replace(/[（(][^）)]*[）)]/g, "").trim();
}

/**
 * ブロック文字列を配列に変換
 * - 区切り文字: カンマ / 読点（、） / 中黒（・） / スラッシュ / 空白 / 波ダッシュ（〜 ～）
 * - 各トークンの括弧内説明文を除去（例: "A1（最前列）" → "A1"）
 * - 「不明」等プレースホルダーは空配列扱い
 * - 説明文パターンに一致するトークンは除外（例: "花道沿いブロック"）
 */
function parseBlocks(raw) {
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(/[,、・\/\s〜～]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => stripParens(s))
    .filter(s =>
      s.length > 0 &&
      !BLOCK_PLACEHOLDER.has(s) &&
      !BLOCK_DESC_PATTERN.test(s)
    );
}

/**
 * 日付文字列を "YYYY-MM-DD" 形式に正規化
 * 対応:
 *   YYYY-MM-DD/DD（複数日程）→ 最初の日付を使用
 *   YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
 *   YYYYMMDD
 *   YYYY-MM / YYYY/MM（日不明）→ null
 */
function parseDate(raw) {
  if (!raw || raw.trim() === "") return null;
  const s = raw.trim();

  // "2026-05-23/24" や "2026-05-23/05-24" → 最初の日付を使用
  const multiDay = s.match(/^(\d{4}-\d{1,2}-\d{1,2})\//);
  if (multiDay) {
    const [y, mo, d] = multiDay[1].split("-");
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY-MM-DD または YYYY/MM/DD または YYYY.MM.DD
  const m1 = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m1) {
    const [, y, mo, d] = m1;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYYMMDD
  const m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m2) {
    const [, y, mo, d] = m2;
    return `${y}-${mo}-${d}`;
  }

  // YYYY-MM / YYYY/MM（日不明）→ null
  return null;
}

/**
 * 日時文字列を ISO 8601 形式に変換
 * Date.parse が失敗する場合は null を返す
 */
function parseDatetime(raw) {
  if (!raw || raw.trim() === "") return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// CSVの1行 → DBの1行 変換
// ---------------------------------------------------------------------------

function convertRow(raw, lineNum) {
  const artist_name = nullIfEmpty(raw.artist_name);
  if (!artist_name) {
    return { skip: true, reason: "artist_name が空", lineNum };
  }

  const venue_name = nullIfEmpty(raw.venue_name);
  if (!venue_name) {
    return { skip: true, reason: "venue_name が空", lineNum };
  }

  const post_type = nullIfEmpty(raw.post_type);
  if (!post_type || !VALID_POST_TYPES.has(post_type)) {
    return { skip: true, reason: `post_type が不正: "${post_type ?? ""}"`, lineNum };
  }

  return {
    skip: false,
    row: {
      id:           randomUUID(),
      artist_name,
      tour_name:    nullIfEmpty(raw.tour_name),
      venue_name,
      performance_date: parseDate(raw.performance_date),
      post_type,
      source_account:  nullIfEmpty(raw.source_account),
      source_post_url: nullIfEmpty(raw.source_post_url),
      posted_at:       parseDatetime(raw.posted_at),
      image_url:       nullIfEmpty(raw.image_url),
      image_summary:   nullIfEmpty(raw.image_summary),

      stage_position:        nullIfEmpty(raw.stage_position),
      hanamichi_position:    nullIfEmpty(raw.hanamichi_position),
      center_stage_position: nullIfEmpty(raw.center_stage_position),
      trolley_route:         nullIfEmpty(raw.trolley_route),
      audience_walkway:      nullIfEmpty(raw.audience_walkway),
      silver_tape_area:      nullIfEmpty(raw.silver_tape_area),

      blocks_detected:               parseBlocks(raw.blocks_detected),
      stage_near_blocks:             parseBlocks(raw.stage_near_blocks),
      hanamichi_candidate_blocks:    parseBlocks(raw.hanamichi_candidate_blocks),
      center_stage_candidate_blocks: parseBlocks(raw.center_stage_candidate_blocks),
      actual_hanamichi_blocks:       parseBlocks(raw.actual_hanamichi_blocks),
      actual_center_stage_blocks:    parseBlocks(raw.actual_center_stage_blocks),
      upgrade_blocks:                parseBlocks(raw.upgrade_blocks),
      fc1_blocks:                    parseBlocks(raw.fc1_blocks),
      fc2_blocks:                    parseBlocks(raw.fc2_blocks),
      general_blocks:                parseBlocks(raw.general_blocks),

      prediction_post_url:          nullIfEmpty(raw.prediction_post_url),
      result_post_url:              nullIfEmpty(raw.result_post_url),
      matched_points:               nullIfEmpty(raw.matched_points),
      missed_points:                nullIfEmpty(raw.missed_points),
      prediction_vs_result_summary: nullIfEmpty(raw.prediction_vs_result_summary),
      source_reasoning_summary:     nullIfEmpty(raw.source_reasoning_summary),

      notes: nullIfEmpty(raw.notes),
    },
  };
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------

async function main() {
  const args   = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvPath = args.find(a => !a.startsWith("--"));

  if (!csvPath) {
    console.error("使い方: node scripts/import_x_seat_posts.mjs <CSVパス> [--dry-run]");
    console.error("例:     node scripts/import_x_seat_posts.mjs data/seventeen_pilot.csv --dry-run");
    process.exit(1);
  }

  // CSV 読み込み
  let content;
  try {
    content = readFileSync(csvPath, "utf-8");
  } catch (e) {
    console.error(`ファイルを開けません: ${csvPath}\n${e.message}`);
    process.exit(1);
  }

  const rawRows = parseCsv(content);
  console.log(`CSV読み込み完了: ${rawRows.length}行（ヘッダー除く）`);

  // 変換
  const results  = rawRows.map((raw, i) => convertRow(raw, i + 2)); // +2 = 1行目ヘッダー
  const valid    = results.filter(r => !r.skip).map(r => r.row);
  const skipped  = results.filter(r => r.skip);

  // サマリー出力
  console.log(`\n変換結果:`);
  console.log(`  有効行:   ${valid.length} 件`);
  console.log(`  スキップ: ${skipped.length} 件`);

  if (skipped.length > 0) {
    console.log(`\nスキップ行の理由:`);
    skipped.forEach(s => {
      console.log(`  行${s.lineNum}: ${s.reason}`);
    });
  }

  // dry-run: 最初の3件を表示して終了
  if (dryRun) {
    console.log(`\n--- dry-run モード: DBへの書き込みは行いません ---`);
    if (valid.length > 0) {
      console.log(`\n変換後データ（最初の ${Math.min(3, valid.length)} 件）:`);
      valid.slice(0, 3).forEach((row, i) => {
        console.log(`\n[${i + 1}] ${row.artist_name} @ ${row.venue_name} (${row.post_type})`);
        console.log(JSON.stringify(row, null, 2));
      });
    } else {
      console.log("\n有効な行がありませんでした。CSVのヘッダー名と必須カラムを確認してください。");
      console.log("必須カラム: artist_name, venue_name, post_type");
    }
    console.log("\ndry-run 完了。");
    return;
  }

  // 本番 INSERT
  if (valid.length === 0) {
    console.log("\n有効な行がないため、INSERTをスキップします。");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let inserted = 0;
  let errored  = 0;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch    = valid.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const { error } = await supabase
      .from("x_seat_posts")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`バッチ ${batchNum} エラー:`, error.message);
      errored += batch.length;
    } else {
      inserted += batch.length;
      console.log(`バッチ ${batchNum}: ${batch.length} 件 INSERT 完了`);
    }
  }

  console.log(`\n完了: ${inserted} 件 INSERT / ${errored} 件 エラー / ${skipped.length} 件 スキップ`);
}

main().catch(err => {
  console.error("予期しないエラー:", err);
  process.exit(1);
});
