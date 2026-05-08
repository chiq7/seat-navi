import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { SeatReport } from "@/lib/types";

const client = new Anthropic();

// ---------------------------------------------------------------------------
// 予測ロジック（サーバー側）
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /api/events/[id]/analysis
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;

  const body = await req.json() as {
    eventTitle: string;
    venue: string;
    reports: SeatReport[];
  };

  const { eventTitle, venue, reports } = body;
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

  // 予測フラグを計算
  const hanamichiBlocks: string[]   = [];
  const centerStageBlocks: string[] = [];

  for (const [block, d] of blockMap.entries()) {
    if (detectHanamichi(d.rows, d.seats))   hanamichiBlocks.push(block);
    if (detectCenterStage(d.rows, d.seats)) centerStageBlocks.push(block);
  }

  // ブロックサマリー文字列
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

  // 予測注記
  const predictionNotes = [
    hanamichiBlocks.length   > 0 ? `・花道の可能性があるブロック: ${hanamichiBlocks.join("、")}（同一列内に席番号の大きな空白あり）` : "",
    centerStageBlocks.length > 0 ? `・センターステージの可能性があるブロック: ${centerStageBlocks.join("、")}（列変化が少なく席番号が広範囲）` : "",
  ].filter(Boolean).join("\n");

  const prompt = `あなたはコンサート会場・座席配置の専門家です。
以下の当選報告データと予測フラグを分析し、250文字以内で日本語のコメントを書いてください。
花道・センターステージの可能性、視認性、当選傾向など、ファンが「どんな席が取れそうか」を判断できる情報を簡潔に伝えてください。

公演: ${eventTitle}
会場: ${venue}

ブロック別報告データ:
${summary}
${predictionNotes ? `\n予測フラグ:\n${predictionNotes}` : ""}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ analysis: text });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json({ analysis: "" }, { status: 500 });
  }
}
