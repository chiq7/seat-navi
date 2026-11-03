import { localReview } from "./localOperations";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CampaignError, type Contribution, type ContributionRepository } from "./contribution";
import { parseSeatInput, type CampaignEvent, type CampaignReport } from "./model";

type Stored = Contribution & { createdAt: string };
const locks = new Map<string, Promise<unknown>>();
export async function serial<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(action); locks.set(key, next);
  try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}
const absent = (e: unknown) => (e as NodeJS.ErrnoException).code === "ENOENT";
async function json(file: string) { return JSON.parse(await fs.readFile(file, "utf8")); }
async function immutable(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = file + randomUUID() + ".tmp", handle = await fs.open(temp, "wx");
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); } finally { await handle.close(); }
  try { await fs.link(temp, file); } finally { await fs.unlink(temp); }
}
export function localContributionRepository(root: string): ContributionRepository {
  const reportPath = (id: string) => path.join(root,"reports",id+".json");
  const withdrawnPath = (id: string) => path.join(root,"withdrawn",id+".json");
  async function withdrawal(id: string): Promise<{at:string}|null> { try { return await json(withdrawnPath(id)); } catch(e) { if(absent(e))return null; throw e; } }
  async function stored(): Promise<Stored[]> {
    let files: string[]; try { files = await fs.readdir(path.join(root,"reports")); } catch(e) { if(absent(e))return []; throw e; }
    const rows: Stored[]=[];
    for(const file of files.filter(f=>f.endsWith(".json"))) { const row=await json(path.join(root,"reports",file)); if(file!==row.id+".json" || !Number.isFinite(Date.parse(row.createdAt)))throw new Error("Corrupt contribution"); rows.push(row); }
    return rows;
  }
  return {
    async read(event) { return serial(root,async()=>{
      let started: {at:string}; try { started=await json(path.join(root,"started.json")); } catch(e) { if(!absent(e))throw e; started={at:new Date().toISOString()}; await immutable(path.join(root,"started.json"),started); }
      const reports: CampaignReport[]=[]; let updatedAt=started.at;
      for(const row of await stored()) { const input=parseSeatInput(row.input,event), removed=await withdrawal(row.id); const review=await localReview(root,row.id); const at=removed?.at??review?.at??row.createdAt; if(at>updatedAt)updatedAt=at; reports.push({...input,id:row.id,createdAt:row.createdAt,source:"self",status:removed?"withdrawn":review?.decision??"received"}); }
      return {reports,updatedAt};
    }); },
    async submit(event: CampaignEvent, value: Contribution) { return serial(root,async()=>{
      try { const previous: Stored=await json(reportPath(value.id)); if(previous.ownerHash!==value.ownerHash || JSON.stringify(previous.input)!==JSON.stringify(value.input))throw new CampaignError("conflict","同じ投稿IDの内容が一致しません。"); return {id:value.id,repeated:true,withdrawn:Boolean(await withdrawal(value.id))}; } catch(e) { if(!absent(e))throw e; }
      parseSeatInput(value.input,event);
      const recent=(await stored()).filter(r=>Date.now()-Date.parse(r.createdAt)<600000);
      if(recent.filter(r=>(r.participantHash??r.rateHash)===(value.participantHash??value.rateHash)).length>=10 || recent.filter(r=>r.rateHash===value.rateHash).length>=300)throw new CampaignError("rate_limited","短時間の投稿が多いため、時間を空けてお試しください。");
      await immutable(reportPath(value.id),{...value,createdAt:new Date().toISOString()}); return {id:value.id,repeated:false,withdrawn:false};
    }); },
    async withdraw(event,id,hash) { return serial(root,async()=>{
      let previous:Stored; try {previous=await json(reportPath(id));} catch(e){if(absent(e))throw new CampaignError("not_found","管理できる投稿が見つかりません。"); throw e;}
      if(previous.ownerHash!==hash || previous.input.eventId!==event.id)throw new CampaignError("not_found","管理できる投稿が見つかりません。");
      const exists=await withdrawal(id); if(!exists)await immutable(withdrawnPath(id),{at:new Date().toISOString()});
      return {id,repeated:Boolean(exists),withdrawn:true};
    }); },
  };
}
