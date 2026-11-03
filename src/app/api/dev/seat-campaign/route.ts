import { prepareLocalCampaignUpdate } from "@/lib/seat-campaign/updateWorker";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { PILOT_EVENT } from "@/lib/seat-campaign/pilot";
import { localContributionRepository } from "@/lib/seat-campaign/managedLocalStore";
import { campaignAction, campaignState, campaignErrorStatus, readCampaignBody, CampaignError } from "@/lib/seat-campaign/contribution";
import { localCampaignEnabled, localCampaignSubmissionAllowed } from "@/lib/seat-campaign/requestPolicy";

export const dynamic = "force-dynamic";
const root = () => path.join(process.cwd(), "research/seat-campaign-production-2026-11-01/local-only", PILOT_EVENT.id);
function enabled(request: NextRequest) { return localCampaignEnabled(process.env.NODE_ENV, request.headers.get("host")); }
function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } }); }
export async function GET(request: NextRequest) {
  if (!enabled(request)) return json({ error: "Not found" }, 404);
  try { return json(await campaignState(localContributionRepository(root()), PILOT_EVENT, true)); }
  catch { return json({ error: "集計を読み取れませんでした。保存済みの情報は保持しています。" }, 503); }
}
export async function POST(request: NextRequest) {
  if (!enabled(request)) return json({ error: "Not found" }, 404);
  if (!localCampaignSubmissionAllowed(request.headers.get("host"), request.headers.get("origin"), request.headers.get("content-type"))) return json({ error: "この画面から送信してください。" }, 403);
  if (Number(request.headers.get("content-length")) > 8192) return json({ error: "入力が長すぎます。" }, 413);
  try {
    const body = await readCampaignBody(request);
    const saved = await campaignAction(localContributionRepository(root()), PILOT_EVENT, body, createHash("sha256").update("dedicated-local-preview").digest("hex"));
    let updatePrepared=true;try{await prepareLocalCampaignUpdate();}catch{updatePrepared=false;} return json({saved,localOnly:true,updatePrepared});
  } catch (error) { return json({ error: error instanceof CampaignError ? error.message : "保存できませんでした。同じ内容で再試行できます。" }, campaignErrorStatus(error)); }
}
