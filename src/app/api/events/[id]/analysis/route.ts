// src/app/api/events/[id]/analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { SeatReport } from "@/lib/types";

const client = new Anthropic();

function detectHanamichi(rows: number[], seats: number[]): boolean {
  const byRow = new Map<number, number[]>();
  for (let i = 0; i < rows.length; i++) {
    if (!byRow.has(rows[i])) byRow.set(rows[i], []);
    byRow.get(rows[i])!.push(seats[i]);
  }
  for (const seatList of byRow.values()) {
    if (seatList.length < 2) continue;
    const sorted = [...seatList].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] > 3) return true;
    }
  }
  return false;
}

function detectCenterStage(rows: number[], seats: number[]): boolean {
  if (rows.length < 3) return false;
  const rowSpread  = Math.max(...rows)  - Math.min(...rows);
  const seatSpread = Math.max(...seats) - Math.min(...seats);
  return rowSpread <= 3 && seatSpread >= 15;
}

/** URL が http(s) で始まる文字列かどうかを簡易チェック */
function isValidUrl(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\/.+/.test(url.trim());
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;

  const body = await req.json() as {
    eventTitle: string;
    venue: string;
    artist: string;
    reports: SeatReport[];
  };

  const { eventTitle, venue, artist, reports } = body;
  if (!reports || reports.length === 0) {
    return NextResponse.json({ analysis: "" });
  }

  // ブロックごとに集約
  type BlockData = { rows: number[]; seats: number[]; types: string[] };
  const blockMap = new Map<string, BlockData>();
  for (const r of reports) {
    if (!blockMap.has(r.block)) blockMap.set(r.block, { rows: [], seats: [], types: [] });
    const b = blockMap.get(r.block)!;
    b.rows.push(r.row_num);
    b.seats.push(r.seat_num);
    b.types.push(r.lottery_type);
  }

  // 予測フラグ
  const hanamichiBlocks: string[]   = [];
  const centerStageBlocks: string[] = [];
  for (const [block, d] of blockMap.entries()) {
    if (detectHanamichi(d.rows, d.seats))   hanamichiBlocks.push(block);
    if (detectCenterStage(d.rows, d.seats)) centerStageBlocks.push(block);
  }

  // ブロックサマリー
  const summary = Array.from(blockMap.entries())
    .map(([block, d]) => {
      const rowMin = Math.min(...d.rows),  rowMax = Math.max(...d.rows);
      const seatMin = Math.min(...d.seats), seatMax = Math.max(...d.seats);
      const typeCount: Record<string, number> = {};
      d.types.forEach((t) => (typeCount[t] = (typeCount[t] ?? 0) + 1));
      const typeStr = Object.entries(typeCount).map(([k, v]) => `${k}×${v}`).join(", ");
      const flags = [
        hanamichiBlocks.includes(block)   ? "[花道候補]"   : "",
        centerStageBlocks.includes(block) ? "[センテ候補]" : "",
      ].filter(Boolean).join(" ");
      return `${block}${flags ? " " + flags : ""}: 列${rowMin}〜${rowMax}, 席${seatMin}〜${seatMax}, [${typeStr}]`;
    })
    .join("\n");

  const predictionNotes = [
    hanamichiBlocks.length   > 0 ? `・花道の可能性があるブロック: ${hanamichiBlocks.join("、")}` : "",
    centerStageBlocks.length > 0 ? `・センターステージの可能性があるブロック: ${centerStageBlocks.join("、")}` : "",
  ].filter(Boolean).join("\n");

  // historical_patterns から同会場の過去データを取得（画像URL含む）
  let historicalSummary = "";
  const imageUrls: string[] = [];

  try {
    const supabase = await createClient();
    const { data: patterns } = await supabase
      .from("historical_patterns")
      .select("block, max_row, max_seat, upgrade_blocks, image_url, image_description, event_name, artist")
      .eq("venue", venue)
      .limit(20);

    if (patterns && patterns.length > 0) {
      // 同アーティストの過去データを優先
      const sameArtist = patterns.filter(p => p.artist === artist);
      const other      = patterns.filter(p => p.artist !== artist);
      const ordered    = [...sameArtist, ...other].slice(0, 10);

      historicalSummary = ordered
        .map(p => `[${p.event_name}] ${p.block}: 最大${p.max_row}列・${p.max_seat}番, アプグレ対象:${p.upgrade_blocks}`)
        .join("\n");

      // 有効な画像URLを最大2枚収集（重複除去）
      for (const p of ordered) {
        if (imageUrls.length >= 2) break;
        if (isValidUrl(p.image_url) && !imageUrls.includes(p.image_url)) {
          imageUrls.push(p.image_url);
        }
      }
    }
  } catch (e) {
    console.error("historical_patterns fetch error:", e);
  }

  const promptText = `あなたはコンサート会場・座席配置の専門家です。
以下の当選報告データと過去の実績データを分析し、250文字以内で日本語のコメントを書いてください。
花道・センターステージの可能性、視認性、当選傾向など、ファンが「どんな席が取れそうか」を判断できる情報を簡潔に伝えてください。
${imageUrls.length > 0 ? "添付画像は同会場の過去公演の座席図です。画像も参考にして分析してください。" : ""}

公演: ${eventTitle}
会場: ${venue}

【今回の報告データ】
${summary}
${predictionNotes ? `\n予測フラグ:\n${predictionNotes}` : ""}
${historicalSummary ? `\n【同会場の過去実績データ】\n${historicalSummary}\n※過去データは参考情報です。今回の報告データを優先してください。` : ""}`;

  // content 配列を組み立て（画像がある場合は画像ブロックを先頭に追加）
  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "url"; url: string } };

  const content: ContentBlock[] = [
    ...imageUrls.map((url): ContentBlock => ({
      type: "image",
      source: { type: "url", url },
    })),
    { type: "text", text: promptText },
  ];

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{ role: "user", content }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ analysis: text });
  } catch (err) {
    // 画像付きで失敗した場合はテキストのみでリトライ
    if (imageUrls.length > 0) {
      console.warn("Image analysis failed, retrying text-only:", err);
      try {
        const fallback = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 350,
          messages: [{ role: "user", content: promptText }],
        });
        const text = fallback.content[0].type === "text" ? fallback.content[0].text : "";
        return NextResponse.json({ analysis: text });
      } catch (fallbackErr) {
        console.error("Fallback analysis error:", fallbackErr);
      }
    } else {
      console.error("Analysis error:", err);
    }
    return NextResponse.json({ analysis: "" }, { status: 500 });
  }
}
