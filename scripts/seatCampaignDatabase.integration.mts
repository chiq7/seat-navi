// Opt-in synthetic-only integration against the explicitly isolated loopback fixture.
// node --experimental-strip-types --import ./scripts/ts-loader.mjs --import ./scripts/seatCampaignServerTestLoader.mjs scripts/seatCampaignDatabase.integration.mts <artifact-directory>
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { campaignAction, campaignState, campaignErrorStatus } from "../src/lib/seat-campaign/contribution.ts";
import { productionContributionRepository, publishedCampaign } from "../src/lib/seat-campaign/productionStore.ts";
import { productionOperationsRepository } from "../src/lib/seat-campaign/productionOperations.ts";

if(process.env.SEAT_CAMPAIGN_ISOLATED_TEST!=="synthetic-local-55439")throw new Error("Explicit isolated-test opt-in required");
const out=path.resolve(process.argv[2]??"");
if(!out.includes("seat-campaign-db-2026-11-03")||!fs.existsSync(path.join(out,"database-tests.json")))throw new Error("Expected existing isolated test artifacts");
const resultPath=path.join(out,"rest-integration-tests.json");
if(fs.existsSync(resultPath))throw new Error("Preserve previous results; choose a new fixture and result file for another run");
const psql=path.join(out,"tools/postgres-runtime/pgsql/bin/psql.exe");
const q=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
function sql(text:string){const r=spawnSync(psql,["-X","-q","-A","-t","-v","ON_ERROR_STOP=1","-h","127.0.0.1","-p","55439","-U","postgres","-d","seat_campaign_qa"],{input:text,encoding:"utf8",windowsHide:true,timeout:30000,env:{...process.env,PGCONNECT_TIMEOUT:"5",PGOPTIONS:"-c statement_timeout=25000 -c lock_timeout=5000"}});assert.equal(r.status,0,r.stderr);return r.stdout.trim();}
assert.equal(sql("select current_database()||':'||host(inet_server_addr())||':'||inet_server_port()"),"seat_campaign_qa:127.0.0.1:55439");
const eventId="qa-rest-integration";
sql(`insert into public.events values('${eventId}','合成REST検証専用','合成会場','2030-12-02');insert into public.seat_campaigns(event_id,title,venue,venue_id,event_date,session_label,source_url,enabled,opens_at,closes_at,ticket_source_url) select '${eventId}','合成REST検証専用',venue,venue_id,event_date,session_label,source_url,true,now()-interval '1 day',now()+interval '1 day',ticket_source_url from public.seat_campaigns where event_id='qa-main';`);
const signingKey="synthetic-only-loopback-test-key-never-use-in-production";
const jwt=(role:string)=>{const encoded=[{alg:"HS256",typ:"JWT"},{role,exp:Math.floor(Date.now()/1000)+3600}].map(v=>Buffer.from(JSON.stringify(v)).toString("base64url")).join(".");return encoded+"."+createHmac("sha256",signingKey).update(encoded).digest("base64url");};
// Supabase's /rest/v1 prefix is normally provided by its gateway. This test proxy
// changes only that prefix and forwards real HTTP to the official PostgREST process.
const gateway=http.createServer(async(req,res)=>{try{if(!req.url?.startsWith("/rest/v1/")){res.writeHead(404).end();return;}const chunks:Buffer[]=[];for await(const c of req)chunks.push(Buffer.from(c));const headers={...req.headers};delete headers.host;delete headers.connection;delete headers["content-length"];const response=await fetch("http://127.0.0.1:55440/"+req.url.slice(9),{method:req.method,headers:headers as Record<string,string>,body:["GET","HEAD"].includes(req.method??"GET")?undefined:Buffer.concat(chunks)});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(502).end("isolated gateway error");}});
await new Promise<void>((resolve,reject)=>{gateway.once("error",reject);gateway.listen(55441,"127.0.0.1",resolve);});
process.env.SEAT_CAMPAIGN_ENABLED="true";
process.env.NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:55441";
process.env.SUPABASE_SERVICE_ROLE_KEY=jwt("service_role");
const rows:{name:string;status:string;milliseconds:number;error?:string}[]=[];
const started=Date.now();
async function test(name:string,fn:()=>unknown){const t=Date.now();try{await fn();rows.push({name,status:"passed",milliseconds:Date.now()-t});}catch(e){rows.push({name,status:"failed",milliseconds:Date.now()-t,error:e instanceof Error?e.message:String(e)});throw e;}console.log(name+": passed");}
try {
 const event=await publishedCampaign(eventId);assert.ok(event);
 const repo=productionContributionRepository(),ops=productionOperationsRepository();
 const id=randomUUID(),token="d".repeat(64),clientToken="e".repeat(64),rate=hash("rest-ip");
 const body={action:"submit",eventId,id,token,clientToken,input:{eventId,date:event.date,session:event.session,seatType:"arena",block:"A1",row:"１",number:"１１"}};
 await test("real SDK table query and RPC save/retry/read preserve normalized values",async()=>{assert.equal(event!.accepting,true);assert.equal((await campaignAction(repo,event!,body,rate)).repeated,false);assert.equal((await campaignAction(repo,event!,body,rate)).repeated,true);const s=await campaignState(repo,event!,false);assert.equal(s.summary.selfSubmissions,1);assert.equal(s.summary.rows[0].row,"1");assert.deepEqual(s.summary.rows[0].numbers,["11"]);assert.equal(JSON.stringify(s).includes(token),false);});
 await test("REST rejects anonymous, authenticated and forged service tokens",async()=>{for(const auth of [undefined,jwt("authenticated"),jwt("service_role")+"invalid"]){const r=await fetch("http://127.0.0.1:55440/rpc/seat_campaign_read",{method:"POST",headers:{"content-type":"application/json",...(auth?{authorization:"Bearer "+auth}:{})},body:JSON.stringify({p_event_id:eventId})});assert.ok([401,403,404].includes(r.status),String(r.status));}});
 await test("real operator review changes only accepted state and stale version conflicts",async()=>{const r=(await ops.list(event!))[0];assert.equal(r.status,"received");await ops.review(event!,{id,expectedVersion:r.version,decision:"accepted",reason:"合成根拠との照合確認",evidenceUrl:"https://example.com/test-proof"});assert.equal((await campaignState(repo,event!,false)).summary.acceptedLocations,1);await assert.rejects(ops.review(event!,{id,expectedVersion:r.version,decision:"rejected",reason:"古い操作の競合確認",evidenceUrl:""}),e=>campaignErrorStatus(e)===409);});
 await test("real update pack read/write is immutable, fresh and idempotent",async()=>{const pack=await ops.prepare(event!,[],false);assert.ok(pack);assert.equal(pack.summary.selfLocations,1);assert.equal(pack.drafts.length,4);assert.equal((await ops.updates(event!))[0].id,pack.id);assert.equal(await ops.prepare(event!,[],false),null);await ops.markPosted(event!,pack.id,"https://x.com/synthetic_test/status/123");await ops.markPosted(event!,pack.id,"https://x.com/synthetic_test/status/123");assert.ok((await ops.updates(event!))[0].postedAt);});
 await test("withdrawal removes public seat details and produces a correction snapshot",async()=>{await assert.rejects(campaignAction(repo,event!,{...body,action:"withdraw",token:"f".repeat(64)},rate),e=>campaignErrorStatus(e)===404);await campaignAction(repo,event!,{...body,action:"withdraw"},rate);const s=await campaignState(repo,event!,false);assert.equal(s.summary.selfSubmissions,0);assert.deepEqual(s.summary.rows,[]);const pack=await ops.prepare(event!,[],false,true);assert.ok(pack);assert.equal(pack.correction,true);assert.equal(pack.removed,1);assert.equal(pack.summary.selfLocations,0);assert.equal((await campaignAction(repo,event!,body,rate)).withdrawn,true);});
 await test("disabled feature never publishes a campaign",async()=>{process.env.SEAT_CAMPAIGN_ENABLED="false";assert.equal(await publishedCampaign(eventId),null);process.env.SEAT_CAMPAIGN_ENABLED="true";});
 await test("RLS denies rows even if a future table grant is accidentally added",()=>{assert.equal(sql("begin;grant select on public.seat_contributions to authenticated;set local role authenticated;select count(*) from public.seat_contributions;rollback;"),"0");});
 await test("address ceiling rejects the 301st recent report across distinct participants",async()=>{sql(`insert into public.seat_contributions(id,event_id,input,owner_hash,rate_hash,participant_hash) select md5('ip-limit-'||g)::uuid,'${eventId}',jsonb_build_object('eventId','${eventId}','date','2030-12-02','session','18:30開演','seatType','arena','block','A2','row','1','number','12'),${q(hash("limit-owner"))},${q(hash("limit-address"))},md5('participant-'||g)||md5('participant-'||g) from generate_series(1,300) g;`);await assert.rejects(repo.submit(event!,{id:randomUUID(),input:{...body.input,row:"1",number:"12"},ownerHash:hash("new-owner"),rateHash:hash("limit-address"),participantHash:hash("new-person")}),e=>campaignErrorStatus(e)===429);});
 await test("real 25000-row database read has no API row-limit truncation",async()=>{sql(`insert into public.seat_contributions(id,event_id,input,owner_hash,rate_hash,participant_hash) select md5('bulk-'||g)::uuid,'${eventId}',jsonb_build_object('eventId','${eventId}','date','2030-12-02','session','18:30開演','seatType','arena','block','A3','row','1','number',g::text),${q(hash("bulk-owner"))},${q(hash("bulk-address"))},${q(hash("bulk-person"))} from generate_series(1,24699) g;`);const r=await repo.read(event!);assert.equal(r.reports.length,25000);assert.equal((await campaignState(repo,event!,false)).summary.selfSubmissions,24999);});
 await test("over 50000 stored reports fails explicitly instead of returning partial totals",async()=>{sql(`insert into public.seat_contributions(id,event_id,input,owner_hash,rate_hash,participant_hash) select md5('capacity-'||g)::uuid,'${eventId}',jsonb_build_object('eventId','${eventId}','date','2030-12-02','session','18:30開演','seatType','arena','block','A4','row','1','number',g::text),${q(hash("capacity-owner"))},${q(hash("capacity-address"))},${q(hash("capacity-person"))} from generate_series(1,25001) g;`);await assert.rejects(repo.read(event!),e=>campaignErrorStatus(e)===503);});
} finally {
 await new Promise<void>(resolve=>gateway.close(()=>resolve()));
 fs.writeFileSync(resultPath,JSON.stringify({createdAt:new Date().toISOString(),syntheticOnly:true,productionWrites:false,postgres:"17.11",postgrest:"16.5",path:"application repository -> supabase-js -> HTTP gateway prefix -> PostgREST -> PostgreSQL",browserToNextRouteTested:false,seconds:(Date.now()-started)/1000,passed:rows.filter(r=>r.status==="passed").length,failed:rows.filter(r=>r.status==="failed").length,rows},null,2)+"\n",{flag:"wx"});
}
