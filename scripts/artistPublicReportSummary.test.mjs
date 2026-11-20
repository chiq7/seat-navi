import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const route = new URL("../src/app/api/public/artist-report-summary/[slug]/route.ts", import.meta.url);
const mocked = new Map([
  ["next/cache", "export const unstable_cache = globalThis.fixture.cached;"],
  ["@/lib/artists", "export const findArtistBySlug = slug => ['zero','live','full','recovery','test'].includes(slug) && {slug};"],
  ["@/lib/seoData", "export const isTestArtist = artist => artist.slug === 'test';"],
  ["@/lib/serverEventData", "export const getCachedArtistEvents = async slug => slug === 'zero' ? [] : [{id:slug}];"],
  ["@/lib/supabase/public", "export const createSupabasePublicClient = () => globalThis.fixture.db;"],
]);
registerHooks({
  resolve(specifier, context, next) { return mocked.has(specifier) ? {url:"mock:"+specifier,shortCircuit:true} : next(specifier, context); },
  load(url, context, next) {
    if (url.startsWith("mock:")) return {format:"module",shortCircuit:true,source:mocked.get(url.slice(5))};
    if (url === route.href) return {format:"module",shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),"utf8"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
    return next(url,context);
  },
});
const limits = [], ticketColumns = new Set("id event_id result lost_application_count ticket_count lottery_type fc_history payment_method seat_type upgrade_result".split(" "));
let rejectRecovery = true;
globalThis.fixture = {
  cached(loader, _keys, options) {
    assert.equal(options.revalidate,300);
    // Mirrors successful-value-only caching. TTL/refresh are checked at the Worker.
    const values=new Map();
    return async slug=>{if(!values.has(slug))values.set(slug,await loader(slug));return values.get(slug)};
  },
  db:{
    from(table) {
      let ids;
      return {
        select(fields,settings){
          const keys=fields.split(",");
          if(table==="seat_reports")assert.deepEqual(keys,["event_id"]);
          else {assert.equal(table,"event_ticket_results");assert.deepEqual(new Set(keys),ticketColumns);assert.equal(settings.count,"exact");}
          return this;
        },
        in(column,values){assert.equal(column,"event_id");ids=values;return this;},
        order(column,settings){assert.equal(column,"created_at");assert.equal(settings.ascending,false);return this;},
        async limit(cap){
          const isSeat=table==="seat_reports";assert.equal(cap,isSeat?500:1000);const slug=ids[0];limits.push({slug,table,cap});
          if(slug==="recovery" && rejectRecovery && isSeat)return {error:{message:"temporarily unavailable"},data:null};
          const rows=isSeat?[{event_id:slug},{event_id:slug}]:[{id:"a",event_id:slug,result:"won"}];
          return {data:rows,error:null,count:isSeat?null:slug==="full"?1001:1};
        }
      };
    }
  }
};
const { GET }=await import(route.href);
const get=slug=>GET(new Request("https://tixrepo.com/api/public/artist-report-summary/"+slug),{params:Promise.resolve({slug})});
test("the shared report API caches public columns by artist, distinguishes empty, capped and failed reads",async()=>{
  const unknown=await get("unknown");assert.equal(unknown.status,404);assert.equal(unknown.headers.get("cache-control"),"no-store");
  assert.equal((await get("test")).status,404);
  assert.deepEqual(await (await get("zero")).json(),{seatCounts:{},tickets:[],ticketDataLimited:false});assert.equal(limits.length,0);
  const first=await get("live");assert.equal(first.status,200);assert.match(first.headers.get("cache-control"),/s-maxage=300/);
  const summary=await first.json();assert.deepEqual(summary.seatCounts,{live:2});assert.equal(summary.ticketDataLimited,false);assert.equal(summary.tickets[0].id,"a");
  await get("live");assert.equal(limits.filter(r=>r.slug==="live").length,2);
  assert.equal((await (await get("full")).json()).ticketDataLimited,true);
  const failed=await get("recovery");assert.equal(failed.status,503);assert.equal(failed.headers.get("cache-control"),"no-store");assert.equal((await failed.json()).tickets,undefined);
  rejectRecovery=false;assert.equal((await get("recovery")).status,200);
});

