import "server-only";
import { campaignDb, dbError, productionContributionRepository } from "./productionStore";
import { CampaignError } from "./contribution";
import { summarizeCampaign } from "./model";
import { contentRevision,prepareUpdate, validPostUrl, type ReviewReport, type UpdatePack, type CampaignOperationsRepository } from "./operations";
export function productionOperationsRepository(): CampaignOperationsRepository {
  const db=campaignDb();
  async function packs(eventId:string) { const {data,error}=await db.from("seat_campaign_updates").select("payload,posted_at,post_url").eq("event_id",eventId).order("prepared_at",{ascending:false}).limit(20); if(error)dbError(error);return (data??[]).map(v=>({...v.payload,postedAt:v.posted_at??undefined,postUrl:v.post_url??undefined}) as UpdatePack); }
  return {
    async list(event) {
      const {data,error}=await db.rpc("seat_campaign_review_list",{p_event_id:event.id});if(error)dbError(error);
      if(!Array.isArray(data))throw new CampaignError("unavailable","確認一覧を取得できません。");return data as ReviewReport[];
    },
    async review(event,r) {
      const {error}=await db.rpc("seat_campaign_review",{p_event_id:event.id,p_id:r.id,p_version:r.expectedVersion,p_decision:r.decision,p_reason:r.reason,p_evidence:r.evidenceUrl});if(error)dbError(error);
    },
    updates: event=>packs(event.id),
    async prepare(event,known,localOnly,automatic=false) {
      const read=await productionContributionRepository().read(event), summary=summarizeCampaign(event,read.reports,read.updatedAt,known), updates=await packs(event.id);
      const {data:postedRows,error:postedError}=await db.from("seat_campaign_updates").select("payload,posted_at,post_url").eq("event_id",event.id).not("posted_at","is",null).order("posted_at",{ascending:false}).limit(1);
      if(postedError)dbError(postedError);
      const posted=postedRows?.[0]?({...postedRows[0].payload,postedAt:postedRows[0].posted_at,postUrl:postedRows[0].post_url} as UpdatePack):null;
      const pack=prepareUpdate(summary,updates[0]??null,posted,new Date().toISOString(),localOnly,automatic);
      if(!pack){if(!updates.length || updates[0].revision===contentRevision(summary)){const {error}=await db.rpc("seat_campaign_ack_revision",{p_event_id:event.id,p_version:read.version});if(error)dbError(error);}return null;}
      const {error}=await db.rpc("seat_campaign_prepare_update",{p_event_id:event.id,p_version:read.version,p_id:pack.id,p_payload:pack});if(error)dbError(error);return pack;
    },
    async markPosted(event,id,url) {if(!validPostUrl(url))throw new CampaignError("invalid","X投稿URLを確認してください。");const {error}=await db.rpc("seat_campaign_mark_posted",{p_event_id:event.id,p_id:id,p_url:url});if(error)dbError(error);},
  };
}
