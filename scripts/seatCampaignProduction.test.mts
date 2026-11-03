import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {campaignAction,campaignState,campaignOriginAllowed,readCampaignBody,ownerHash,campaignErrorStatus} from "../src/lib/seat-campaign/contribution.ts";
import {localContributionRepository} from "../src/lib/seat-campaign/managedLocalStore.ts";
import {PILOT_EVENT as event} from "../src/lib/seat-campaign/pilot.ts";
import {summarizeCampaign, type CampaignReport} from "../src/lib/seat-campaign/model.ts";
import {campaignPredictionReports} from "../src/lib/seat-campaign/predictionAdapter.ts";
import {cellFillColor,SEAT_ONLY_FILL} from "../src/lib/arena-map/arenaMapColors.ts";
import {buildFixedArenaGrid} from "../src/lib/arena-map/arenaMapLayout.ts";
import {campaignMetric,xCampaignDrafts,xShareIntent,readReceipt,campaignLinks} from "../src/lib/seat-campaign/clientFlow.ts";

const input={eventId:event.id,date:event.date,session:event.session,seatType:"arena",block:"A1",row:"1",number:"11"};
const token="a".repeat(64), rate="b".repeat(64);
async function fixture(){const root=path.join(process.cwd(),"research/seat-campaign-production-2026-11-01/test-runs",randomUUID());return{root,repo:localContributionRepository(root)};}
const body=()=>({action:"submit",eventId:event.id,id:randomUUID(),token,input});
test("save, retry, owner withdrawal and retry after withdrawal cannot resurrect a contribution",async()=>{
  const {repo}=await fixture(), b=body();
  const first=await campaignAction(repo,event,b,rate);assert.equal(first.repeated,false);
  assert.equal((await campaignAction(repo,event,b,rate)).repeated,true);
  assert.equal((await campaignState(repo,event,true)).summary.selfSubmissions,1);
  await assert.rejects(campaignAction(repo,event,{...b,action:"withdraw",token:"c".repeat(64)},rate));
  const removed=await campaignAction(repo,event,{...b,action:"withdraw"},rate);assert.equal(removed.withdrawn,true);
  assert.equal((await campaignAction(repo,event,{...b,action:"withdraw"},rate)).repeated,true);
  assert.equal((await campaignAction(repo,event,b,rate)).withdrawn,true);
  assert.equal((await campaignState(repo,event,true)).summary.selfSubmissions,0);
});
test("concurrent duplicate delivery is counted once and conflicts never overwrite",async()=>{
  const{repo}=await fixture(),b=body();const result=await Promise.all(Array.from({length:8},()=>campaignAction(repo,event,b,rate)));
  assert.equal(result.filter(x=>!x.repeated).length,1);
  await assert.rejects(campaignAction(repo,event,{...b,input:{...input,number:"12"}},rate),e=>campaignErrorStatus(e)===409);
  await assert.rejects(campaignAction(repo,event,{...b,token:"c".repeat(64)},rate),e=>campaignErrorStatus(e)===409);
  assert.equal((await campaignState(repo,event,true)).summary.rows[0].numbers[0],"11");
});
test("concurrent per-address limit accepts ten; withdrawals do not reset abuse count",async()=>{
  const{repo}=await fixture();const bodies=Array.from({length:15},()=>body());
  const result=await Promise.allSettled(bodies.map(b=>campaignAction(repo,event,b,rate)));
  assert.equal(result.filter(x=>x.status==="fulfilled").length,10);
  const first=bodies[result.findIndex(x=>x.status==="fulfilled")];await campaignAction(repo,event,{...first,action:"withdraw"},rate);
  await assert.rejects(campaignAction(repo,event,body(),rate),e=>campaignErrorStatus(e)===429);
});
test("cross-event, day, session, forged metadata, invalid ownership and IDs",async()=>{
  const{repo}=await fixture();for(const field of ["eventId","date","session"]){await assert.rejects(campaignAction(repo,event,{...body(),input:{...input,[field]:"wrong"}},rate));}
  for(const extra of [{id:"../../outside"},{token:"bad"},{eventId:"another"}])await assert.rejects(campaignAction(repo,event,{...body(),...extra},rate));
  const b=body();await campaignAction(repo,event,{...b,input:{...input,lottery_type:"fc1",status:"accepted",source:"external"}},rate);
  const raw=await repo.read(event);assert.equal(raw.reports[0].source,"self");assert.equal(raw.reports[0].status,"received");assert.equal("lottery_type" in raw.reports[0],false);
  assert.equal("ownerHash" in raw.reports[0],false);assert.equal("rateHash" in raw.reports[0],false);
  assert.notEqual(ownerHash(token),token);
});
test("corrupt stored data fails closed instead of returning a false zero",async()=>{
  const{repo,root}=await fixture();const b=body();await campaignAction(repo,event,b,rate);
  await fs.writeFile(path.join(root,"reports",b.id+".json"),"damaged");await assert.rejects(campaignState(repo,event,true));
});
test("streaming body limit and strict same-origin JSON reject untrusted posts",async()=>{
  assert.equal(campaignOriginAllowed("https://tixrepo.com","application/json",false),true);
  for(const origin of [null,"https://evil.test","https://tixrepo.com.evil.test","http://tixrepo.com"])assert.equal(campaignOriginAllowed(origin,"application/json",false),false);
  assert.equal(campaignOriginAllowed("https://tixrepo.com","text/plain",false),false);
  const req=(data:string)=>new Request("http://localhost",{method:"POST",body:data});
  assert.deepEqual(await readCampaignBody(req('{"action":"submit"}')),{action:"submit"});
  await assert.rejects(readCampaignBody(req("x".repeat(9000))));await assert.rejects(readCampaignBody(req("broken")));
});
const report=(override:Partial<CampaignReport>={}):CampaignReport=>({...input,seatType:"arena",id:randomUUID(),createdAt:"2026-11-01T00:00:00Z",source:"self",status:"accepted",...override});
test("map adapter requires matching event and approved block; no ranges, stands or sparse-row interpolation",()=>{
  const s=summarizeCampaign(event,[report(),report({row:"20",number:"361"}),report({block:"A2"}),report({seatType:"stand"}),report({row:"B"}),report({number:"10-19"})],"2026-11-01T00:00:00Z");
  assert.deepEqual(campaignPredictionReports(s,"different",new Set(["A1"])),[]);
  assert.deepEqual(campaignPredictionReports(s,event.id,new Set()),[]);
  const points=campaignPredictionReports(s,event.id,new Set(["A1"]));assert.deepEqual(points.map(r=>[r.row_num,r.seat_num]),[[1,11],[20,361]]);
  for(const p of points){assert.equal(p.lottery_type,null);assert.equal(p.sourceKind,"seat_only");}
  const grid=buildFixedArenaGrid(points);const cells=grid.gridBlocks.flatMap(b=>b.cells);assert.equal(cells.length,2);
  for(const c of cells)for(const mode of ["lottery","fcHistory","ticketCount","payment","upgrade"] as const)assert.equal(cellFillColor(c,mode),SEAT_ONLY_FILL);
});
test("tracking and sharing exclude private values, tokens and acquisition data",()=>{
  const m=campaignMetric("save_success",event.id,"?utm_source=x&token=SECRET&number=361&fc=fc1","report");
  assert.deepEqual(Object.keys(m.params).sort(),["campaign_view","entry_source","event_id","post_id"]);
  assert.equal(JSON.stringify(m).includes("SECRET"),false);
  assert.equal(campaignMetric("arrival",event.id,"?utm_source=arbitrary-user-name","report").params.entry_source,"direct");
  const s=summarizeCampaign(event,[report({block:"PRIVATE-BLOCK",number:"99999"})],"2026-11-01T00:00:00Z");
  assert.equal(xShareIntent(s).includes("99999"),false);assert.equal(xShareIntent(s).includes("PRIVATE-BLOCK"),false);
  const link=new URL(new URL(xShareIntent(s)).searchParams.get("url")!);assert.equal(link.searchParams.get("utm_source"),"x");
});
test("four conservative short X drafts fit and never invent missing blocks",()=>{
  const s=summarizeCampaign({...event,title:"長い公演名".repeat(30)},[report()],"2026-11-01T00:00:00Z");
  for(const local of [false,true]){const drafts=xCampaignDrafts(s,local);assert.equal(drafts.length,4);for(const d of drafts)assert.ok(d.weight<=280,`${d.kind}: ${d.weight}`);assert.equal(drafts[2].text.includes("A2"),false);}
});
test("receipt is scoped to exact performance; no credential in links",()=>{
  const r={...body()};assert.equal(readReceipt(JSON.stringify(r),event)?.id,r.id);
  assert.equal(readReceipt(JSON.stringify(r),{...event,session:"another"}),null);
  assert.equal(readReceipt("broken",event),null);
  assert.equal(campaignLinks(event.id,false).form,`/seat-campaign/${event.id}?view=report`);
});
