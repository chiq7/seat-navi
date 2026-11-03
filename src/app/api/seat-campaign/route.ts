import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { after, NextRequest, NextResponse } from "next/server";
import { productionOperationsRepository } from "@/lib/seat-campaign/productionOperations";
import { VERIFIED_CAMPAIGN_LAYOUTS } from "@/lib/seat-campaign/verifiedLayouts";
import { campaignAction, campaignState, campaignErrorStatus, campaignOriginAllowed, readCampaignBody, CampaignError } from "@/lib/seat-campaign/contribution";
import { publishedCampaign, productionCampaignEnabled, productionContributionRepository } from "@/lib/seat-campaign/productionStore";
export const dynamic="force-dynamic";
function json(value:unknown,status=200) {return NextResponse.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
function failure(error:unknown) {return json({error:error instanceof CampaignError?error.message:"集計に接続できません。時間を空けてお試しください。"},campaignErrorStatus(error));}
export async function GET(request:NextRequest) {
  if(!productionCampaignEnabled())return json({error:"Not found"},404);
  try {const event=await publishedCampaign(request.nextUrl.searchParams.get("eventId")??""); if(!event)return json({error:"公演が見つかりません。"},404); return json(await campaignState(productionContributionRepository(),event,false));} catch(e){return failure(e);}
}
export async function POST(request:NextRequest) {
  if(!productionCampaignEnabled())return json({error:"Not found"},404);
  if(!campaignOriginAllowed(request.headers.get("origin"),request.headers.get("content-type"),false))return json({error:"この公演の入力画面から送信してください。"},403);
  try {
    const body=await readCampaignBody(request) as Record<string,unknown>;
    const event=await publishedCampaign(typeof body.eventId==="string"?body.eventId:""); if(!event)return json({error:"公演が見つかりません。"},404);
    // Vercel overwrites this header. Fail closed on hosts without a trusted client address.
    const ip=request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
    if(process.env.VERCEL!=="1" || !ip || !isIP(ip) || !process.env.SUPABASE_SERVICE_ROLE_KEY)throw new CampaignError("unavailable","投稿受付の接続設定を確認中です。");
    const rateHash=createHmac("sha256",process.env.SUPABASE_SERVICE_ROLE_KEY).update("seat-campaign:"+ip).digest("hex");
    const saved=await campaignAction(productionContributionRepository(),event,body,rateHash);
    after(async()=>{try{const layout=VERIFIED_CAMPAIGN_LAYOUTS[event.id];await productionOperationsRepository().prepare(event,(layout?.blocks??[]).map(block=>({seatType:"arena",block,sourceUrl:layout.sourceUrl})),false,true);}catch{console.warn("seat_campaign_update_pending");}});
    return json({saved,localOnly:false});
  } catch(e){return failure(e);}
}
