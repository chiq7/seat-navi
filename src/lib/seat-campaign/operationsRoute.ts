import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { PILOT_EVENT } from "./pilot";
import { localCampaignEnabled } from "./requestPolicy";
import { localOperationsRepository } from "./localOperations";
import { publishedCampaign, productionCampaignEnabled } from "./productionStore";
import { productionOperationsRepository } from "./productionOperations";
import { operatorAuthorized } from "./operatorAuth";
import { contentRevision,parseReview, postMetrics } from "./operations";
import { summarizeCampaign } from "./model";
import { campaignOriginAllowed, readCampaignBody, campaignErrorStatus, CampaignError } from "./contribution";
import { VERIFIED_CAMPAIGN_LAYOUTS } from "./verifiedLayouts";
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function operationsRoute(request: NextRequest, local: boolean) {
  const enabled = local ? localCampaignEnabled(process.env.NODE_ENV,request.headers.get("host")) : productionCampaignEnabled();
  if(!enabled)return json({error:"Not found"},404);
  if(!local && !operatorAuthorized(request.headers.get("authorization"),process.env.SEAT_CAMPAIGN_OPERATOR_TOKEN))return json({error:"運営認証が必要です。"},401);
  if(request.method==="POST" && !campaignOriginAllowed(request.headers.get("origin"),request.headers.get("content-type"),local))return json({error:"この操作画面から実行してください。"},403);
  try {
    const event=local?PILOT_EVENT:await publishedCampaign(request.nextUrl.searchParams.get("eventId")??"");
    if(!event)return json({error:"公演が見つかりません。"},404);
    const repository=local?localOperationsRepository(path.join(process.cwd(),"research/seat-campaign-production-2026-11-01/local-only",event.id)):productionOperationsRepository();
    const layout=VERIFIED_CAMPAIGN_LAYOUTS[event.id];
    const known=(layout?.blocks??[]).map(block=>({seatType:"arena" as const,block,sourceUrl:layout.sourceUrl}));
    if(request.method==="POST") {
      const body=await readCampaignBody(request) as Record<string,unknown>;
      if(body.action==="review") { let decision;try{decision=parseReview(body);}catch(e){throw new CampaignError("invalid",(e as Error).message);}await repository.review(event,decision); }
      else if(body.action==="posted")await repository.markPosted(event,String(body.id??""),String(body.url??""));
      else if(body.action!=="prepare")throw new CampaignError("invalid","操作を確認してください。");
      await repository.prepare(event,known,local);
    }
    const reports=await repository.list(event),updates=await repository.updates(event);
    return json({event,reports,updates,currentRevision:contentRevision(summarizeCampaign(event,reports,new Date().toISOString(),known)),metrics:postMetrics(event,reports),localOnly:local});
  }catch(e){return json({error:e instanceof CampaignError?e.message:"運営情報を読み取れませんでした。保存済みの情報を保持しています。"},campaignErrorStatus(e));}
}
