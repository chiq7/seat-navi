import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs/promises";import path from "node:path";import {randomUUID} from "node:crypto";
import {campaignAction,campaignState} from "../src/lib/seat-campaign/contribution.ts";
import {localContributionRepository} from "../src/lib/seat-campaign/managedLocalStore.ts";
import {localOperationsRepository} from "../src/lib/seat-campaign/localOperations.ts";
import {parseReview,prepareUpdate,postMetrics} from "../src/lib/seat-campaign/operations.ts";
import {PILOT_EVENT as event} from "../src/lib/seat-campaign/pilot.ts";
import {receiptLedger,storeReceipt,removeReceipt} from "../src/lib/seat-campaign/receiptLedger.ts";
import {receiptKey,campaignMetric,xCampaignDrafts} from "../src/lib/seat-campaign/clientFlow.ts";
import {operatorAuthorized} from "../src/lib/seat-campaign/operatorAuth.ts";
import {summarizeCampaign,type CampaignReport} from "../src/lib/seat-campaign/model.ts";
import {campaignPredictionReports} from "../src/lib/seat-campaign/predictionAdapter.ts";
import {makeSearchDraft,readSearchDraft,searchDraftPrefill} from "../src/lib/seat-campaign/searchHandoff.ts";
import {prepareCampaignRegistration} from "../src/lib/seat-campaign/registration.ts";
import {campaignClientError} from "../src/lib/seat-campaign/clientError.ts";
const token="a".repeat(64),rate="b".repeat(64),now="2026-11-01T01:00:00Z";
const input={eventId:event.id,date:event.date,session:event.session,seatType:"arena" as const,block:"A1",row:"1",number:"11"};
const body=(number="11")=>({action:"submit",eventId:event.id,id:randomUUID(),token,input:{...input,number}});
async function fixture(){const root=path.join(process.cwd(),"research/seat-campaign-operations-2026-11-01/tests",randomUUID());await fs.mkdir(root,{recursive:true});return{repo:localContributionRepository(root),ops:localOperationsRepository(root)};}
class StorageMock{values=new Map<string,string>();get length(){return this.values.size;}getItem(k:string){return this.values.get(k)??null;}setItem(k:string,v:string){this.values.set(k,v);}removeItem(k:string){this.values.delete(k);}key(i:number){return [...this.values.keys()][i]??null;}}
test("legacy receipt migrates without losing earlier contributions; individual withdrawal preserves others",()=>{
 const storage=new StorageMock(),one=body(),two=body("12");storage.setItem(receiptKey(event.id),JSON.stringify(one));
 storeReceipt(storage,event,two,"pending");assert.equal(receiptLedger(storage,event).length,2);assert.equal(receiptLedger(storage,event).find(r=>r.id===two.id)?.state,"pending");
 storeReceipt(storage,event,two,"saved");removeReceipt(storage,event,one.id);assert.deepEqual(receiptLedger(storage,event).map(r=>r.id),[two.id]);
 assert.equal(receiptLedger(storage,{...event,session:"other"}).length,0);
});
test("two independent tab writes preserve both management capabilities and quota failure happens before submission",()=>{
 const storage=new StorageMock(),a=body(),b=body("20");storeReceipt(storage,event,a,"pending");storeReceipt(storage,event,b,"pending");storeReceipt(storage,event,a,"saved");assert.equal(receiptLedger(storage,event).length,2);
 assert.throws(()=>storeReceipt({...storage,length:0,key:()=>null,getItem:()=>null,removeItem:()=>{},setItem:()=>{throw new Error("quota");}},event,body(),"pending"));
});
test("review requires evidence, rejects stale updates, keeps private data out, withdrawal overrides accepted",async()=>{
 const {repo,ops}=await fixture(),b=body();await campaignAction(repo,event,b,rate);
 let r=(await ops.list(event))[0];assert.equal(r.status,"received");assert.equal("ownerHash" in r,false);
 assert.throws(()=>parseReview({id:b.id,expectedVersion:r.version,decision:"accepted",reason:"券面と公演を照合した",evidenceUrl:""}));
 const request=parseReview({id:b.id,expectedVersion:r.version,decision:"accepted",reason:"試験資料の同一公演と番号を照合",evidenceUrl:"https://example.com/fixture"});
 await ops.review(event,request);await assert.rejects(ops.review(event,request));r=(await ops.list(event))[0];assert.equal(r.status,"accepted");
 const s=(await campaignState(repo,event,true)).summary;assert.equal(s.acceptedLocations,1);assert.equal(campaignPredictionReports(s,event.id,new Set(["A1"])).length,1);
 await campaignAction(repo,event,{...b,action:"withdraw"},rate);assert.equal((await campaignState(repo,event,true)).summary.acceptedLocations,0);await assert.rejects(ops.review(event,{...request,expectedVersion:r.version}));
});
test("rejecting a report updates summary, prepare is idempotent and old snapshots cannot be recorded as newly posted",async()=>{
 const {repo,ops}=await fixture(),b=body();await campaignAction(repo,event,b,rate);const p=await ops.prepare(event,[],true);assert.ok(p);assert.equal(await ops.prepare(event,[],true),null);
 await ops.markPosted(event,p.id,"https://x.com/fixture/status/123");
 const r=(await ops.list(event))[0];await ops.review(event,parseReview({id:r.id,expectedVersion:r.version,decision:"rejected",reason:"試験：別公演の混入を確認",evidenceUrl:""}));
 const next=await ops.prepare(event,[],true);assert.equal(next?.summary.selfSubmissions,0);assert.equal(next?.removed,1);assert.equal(next?.correction,true);
 const c=body("20");await campaignAction(repo,event,c,rate);await assert.rejects(ops.markPosted(event,next!.id,"https://x.com/fixture/status/456"));
});
test("a content cycle A to B to A prepares a fresh correction without immutable file collision",async()=>{
 const {repo,ops}=await fixture(),a=body(),b=body("20");await campaignAction(repo,event,a,rate);const p1=await ops.prepare(event,[],true);await campaignAction(repo,event,b,rate);await ops.prepare(event,[],true);await campaignAction(repo,event,{...b,action:"withdraw"},rate);const p3=await ops.prepare(event,[],true);assert.ok(p3);assert.notEqual(p1!.id,p3.id);
});
test("unreviewed contributions stay in listing but never become geometry points",()=>{
 const reports:CampaignReport[]=[{...input,id:"one",createdAt:now,source:"self",status:"received"},{...input,id:"two",row:"20",createdAt:now,source:"self",status:"accepted"}];
 const s=summarizeCampaign(event,reports,now);assert.equal(s.selfLocations,2);assert.equal(s.acceptedLocations,1);assert.deepEqual(campaignPredictionReports(s,event.id,new Set(["A1"])).map(r=>r.row_num),[20]);
});
test("fixed post attribution connects receipt and accepted result without seat data in analytics",async()=>{
 const {repo,ops}=await fixture();await campaignAction(repo,event,{...body(),acquisition:{source:"x",postId:"progress-012345abcdef",token:"PRIVATE"}},rate);
 const metrics=postMetrics(event,await ops.list(event));assert.equal(metrics[0].postId,"progress-012345abcdef");assert.equal(metrics[0].active,1);
 const m=campaignMetric("arrival",event.id,"?utm_source=x&utm_content=progress-012345abcdef&number=99999&token=PRIVATE","report");assert.equal(m.params.post_id,"progress-012345abcdef");assert.ok(!JSON.stringify(m).includes("99999"));
 assert.equal(campaignMetric("arrival",event.id,"?utm_content=my-private-name","report").params.post_id,"unattributed");
});
test("shared address does not impose the ten contribution participant limit on different visitors",async()=>{
 const {repo}=await fixture();for(let i=0;i<12;i++)await campaignAction(repo,event,{...body(String(i+1)),clientToken:i.toString(16).padStart(64,"0")},rate);
 assert.equal((await campaignState(repo,event,true)).summary.selfSubmissions,12);
});
test("operator authentication fails closed, including absent, short, prefixed and wrong tokens",()=>{
 assert.equal(operatorAuthorized(null,undefined),false);assert.equal(operatorAuthorized("Bearer short","short"),false);assert.equal(operatorAuthorized(`Bearer ${token}`,token),true);assert.equal(operatorAuthorized(`Bearer ${token}x`,token),false);assert.equal(operatorAuthorized(`Basic ${token}`,token),false);
});
test("update drafts include time, bounded verified missing blocks and changed counts; sparse numbers stay sparse",()=>{
 const s=summarizeCampaign(event,[{...input,id:"one",createdAt:now,source:"self",status:"received"}],now,[{seatType:"arena",block:"B2",sourceUrl:"https://example.com/source"}]);
 const pack=prepareUpdate(s,null,null,now,true)!;assert.ok(pack.drafts[1].text.includes("時点"));assert.ok(pack.drafts[2].text.includes("B2"));assert.ok(pack.drafts[3].text.includes("初回集計"));
 for(const d of xCampaignDrafts({...s,event:{...event,title:"長い公演名".repeat(30)}},false,{added:5000,removed:200,id:"a".repeat(64)}))assert.ok(d.weight<=280,`${d.kind} ${d.weight}`);
 assert.deepEqual(s.rows[0].numbers,["11"]);
});
test("25000 submissions aggregate without inventing attendees or filling missing seats",()=>{
 const reports:CampaignReport[]=Array.from({length:25000},(_,i)=>({...input,id:String(i),number:String(i%500+1),createdAt:now,source:"self",status:i%2?"received":"accepted"}));
 const s=summarizeCampaign(event,reports,now);assert.equal(s.selfSubmissions,25000);assert.equal(s.selfLocations,500);assert.equal(s.acceptedLocations,250);
});
test("automatic ordinary updates coalesce while corrections to posted content are immediate",()=>{
 const a:CampaignReport={...input,id:"one",createdAt:now,source:"self",status:"accepted"};
 const first=summarizeCampaign(event,[a],now),p=prepareUpdate(first,null,null,now,true)!;
 const later=new Date(Date.parse(now)+1000).toISOString(),two=summarizeCampaign(event,[a,{...a,id:"two",number:"20"}],later);
 assert.equal(prepareUpdate(two,p,null,later,true,true),null);
 assert.ok(prepareUpdate(two,p,null,new Date(Date.parse(now)+300000).toISOString(),true,true));
 const withdrawn=summarizeCampaign(event,[{...a,status:"withdrawn"}],later);
 assert.equal(prepareUpdate(withdrawn,p,p,later,true,true)?.correction,true);
});
test("search handoff preserves numbers but does not infer ticket block or seat type",()=>{
 const draft=makeSearchDraft(event,event.venueId!,"20","11","参考ブロック",randomUUID(),1000,null);
 const read=readSearchDraft(JSON.stringify(draft),event,event.venueId!,1001)!;
 assert.deepEqual(searchDraftPrefill(read),{seatType:"",block:"",row:"20",number:"11"});
 assert.equal(readSearchDraft(JSON.stringify(draft),event,"tokyo-dome",1001),null);
});
test("authorized migration keeps literal regex anchors and one definition per object",async()=>{
 const sql=await fs.readFile("supabase/migrations/20261103123954_seat_campaign_contributions.sql","utf8");
 assert.equal((sql.match(/create table public\./g)||[]).length,4);assert.equal((sql.match(/create function public\./g)||[]).length,8);
 assert.ok(sql.includes("'^[a-z0-9-]{1,64}$'"));assert.ok(sql.includes("'seat-participant:'"));assert.ok(sql.includes("closes_at is not null"));assert.ok(sql.length<35000);
});
test("campaign registration requires exact event, ticket evidence and zoned times and always starts disabled",()=>{
 const record={id:event.id,title:event.title,date:event.date,venue:event.venue};
 const candidate={eventId:event.id,title:event.title,date:event.date,venue:event.venue,venueId:event.venueId!,session:event.session,sourceUrl:event.sourceUrl,ticketSourceUrl:"https://example.com/test-fixture",opensAt:"2026-11-01T10:00:00+09:00",closesAt:"2026-12-02T18:30:00+09:00"};
 assert.equal(prepareCampaignRegistration(candidate,record).enabled,false);
 assert.throws(()=>prepareCampaignRegistration({...candidate,date:"2026-12-03"},record));
 assert.throws(()=>prepareCampaignRegistration({...candidate,ticketSourceUrl:""},record));
 assert.throws(()=>prepareCampaignRegistration({...candidate,opensAt:"2026-11-01T10:00:00"},record));
});
test("communication uncertainty stays explicit and understandable instead of suggesting a new submission",()=>{
 const e=new Error("signal timed out");e.name="TimeoutError";
 assert.match(campaignClientError(e,"失敗"),/情報を保持/);
 assert.match(campaignClientError(new TypeError("Failed to fetch"),"失敗"),/通信状態/);
 assert.equal(campaignClientError(new Error("公演が一致しません。"),"失敗"),"公演が一致しません。");
});
