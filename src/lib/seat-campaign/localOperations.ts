import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { localContributionRepository, serial } from "./managedLocalStore";
import { CampaignError } from "./contribution";
import { summarizeCampaign, type CampaignEvent } from "./model";
import { acquisition } from "./attribution";
import { contentRevision, prepareUpdate, validPostUrl, type ReviewRequest, type ReviewReport, type UpdatePack, type CampaignOperationsRepository } from "./operations";
const absent = (e: unknown) => (e as NodeJS.ErrnoException).code === "ENOENT";
async function entries<T>(dir: string): Promise<T[]> { let names: string[]; try { names = await fs.readdir(dir); } catch(e) { if(absent(e))return [];throw e; } return Promise.all(names.filter(n=>n.endsWith(".json")).sort().map(async n=>JSON.parse(await fs.readFile(path.join(dir,n),"utf8")) as T)); }
async function immutable(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), {recursive:true});
  const temp=file+randomUUID()+".tmp", h=await fs.open(temp,"wx");
  try {await h.writeFile(JSON.stringify(value));await h.sync();}finally{await h.close();}
  try{await fs.link(temp,file);}finally{await fs.unlink(temp);}
}
type Review = ReviewRequest & { version: string; at: string };
export async function localReview(root: string, id: string): Promise<Review | null> { return (await entries<Review>(path.join(root,"reviews",id))).at(-1) ?? null; }
export function localOperationsRepository(root: string): CampaignOperationsRepository {
  const source=localContributionRepository(root), key=root+":operations";
  async function list(event: CampaignEvent): Promise<ReviewReport[]> {
    const {reports}=await source.read(event);
    return Promise.all(reports.map(async r=>{ const review=await localReview(root,r.id); const stored=JSON.parse(await fs.readFile(path.join(root,"reports",r.id+".json"),"utf8")); return {...r,version:r.status==="withdrawn"?"withdrawn":review?.version??"0",reason:review?.reason,evidenceUrl:review?.evidenceUrl,acquisition:acquisition(stored.acquisition)}; }));
  }
  async function updates(): Promise<UpdatePack[]> {
    const packs=await entries<UpdatePack>(path.join(root,"updates"));
    const posts=await entries<{id:string;at:string;url:string}>(path.join(root,"posted"));
    return packs.map(p=>{const post=posts.find(v=>v.id===p.id);return post?{...p,postedAt:post.at,postUrl:post.url}:p;}).sort((a,b)=>b.preparedAt.localeCompare(a.preparedAt));
  }
  return {
    list, updates,
    review: async (event,request)=>serial(key,async()=>{
      const current=(await list(event)).find(r=>r.id===request.id);
      if(!current)throw new CampaignError("not_found","報告が見つかりません。");
      if(current.version!==request.expectedVersion || current.status==="withdrawn")throw new CampaignError("conflict","別の操作で更新されています。再読込してください。");
      const version=String(Number(current.version)+1);
      await immutable(path.join(root,"reviews",request.id,version.padStart(8,"0")+".json"),{...request,version,at:new Date().toISOString()});
    }),
    prepare: async(event,known,localOnly,automatic=false)=>serial(key,async()=>{
      const read=await source.read(event), summary=summarizeCampaign(event,read.reports,read.updatedAt,known), packs=await updates();
      const posted=packs.filter(p=>p.postedAt).sort((a,b)=>b.postedAt!.localeCompare(a.postedAt!))[0]??null;
      const pack=prepareUpdate(summary,packs[0]??null,posted,new Date().toISOString(),localOnly,automatic);
      if(pack)await immutable(path.join(root,"updates",pack.id+".json"),pack);
      return pack;
    }),
    markPosted:async(event,id,url)=>serial(key,async()=>{
      if(!validPostUrl(url))throw new CampaignError("invalid","X投稿のURLを確認してください。");
      const packs=await updates(),pack=packs.find(p=>p.id===id);
      if(!pack)throw new CampaignError("not_found","更新版が見つかりません。");
      const read=await source.read(event), current=summarizeCampaign(event,read.reports,read.updatedAt,pack.summary.missingBlocks);
      // Reconstructing known blocks from missing blocks is insufficient after new reports: compare content without missing metadata here.
      if(JSON.stringify([current.keys,current.acceptedKeys,current.selfSubmissions])!==JSON.stringify([pack.summary.keys,pack.summary.acceptedKeys,pack.summary.selfSubmissions]))throw new CampaignError("conflict","報告が変わりました。最新版を準備してください。");
      if(pack.postedAt){if(pack.postUrl!==url)throw new CampaignError("conflict","別の投稿URLで記録済みです。");return;}
      await immutable(path.join(root,"posted",id+".json"),{id,at:new Date().toISOString(),url,revision:contentRevision(pack.summary)});
    }),
  };
}
