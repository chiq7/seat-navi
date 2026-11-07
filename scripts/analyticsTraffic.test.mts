import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {classifyAnalyticsExclusion, createVerificationMarker, gaBootstrapScript} from '../src/lib/analyticsTraffic.ts';
const now=1803380400000;
const current=(role:string)=>JSON.stringify({v:1,role,startedAt:now-36000000});
function run(persistent:string|null=null,legacy:string|null=null,pathname='/venues/belluna-dome',{
 search='', userAgent='Safari', referrer='https://chatgpt.com/?private=secret',
}={}){
 const listeners:Record<string,Function>={};let reloads=0;
 const w:any={dataLayer:[],dispatchEvent(){},addEventListener(name:string,fn:Function){listeners[name]=fn;}};
 const ctx={window:w,location:{origin:'https://tixrepo.com',pathname,search,reload(){reloads++;}},navigator:{userAgent},document:{referrer},URLSearchParams,localStorage:{getItem(){return persistent;}},sessionStorage:{getItem(){return legacy;}},Date:class extends Date{static now(){return now;}},Event:class{}};
 vm.runInNewContext(gaBootstrapScript('G-TEST123'),ctx);
 const commands=w.dataLayer.map((v:any)=>Array.from(v));
 const config=commands.find((v:any)=>v[0]==='config')?.[2];
 const events=commands.filter((v:any)=>v[0]==='event').map((v:any)=>v[1]);
 return {w,config,events,listeners,reloads:()=>reloads};
}
test('persistent Codex/operator opt-out suppresses GA before configuration beyond two hours',()=>{
 for(const role of ['codex','operator']){const r=run(current(role));assert.equal(r.w['ga-disable-G-TEST123'],true);assert.equal(r.config,undefined);assert.equal(r.w.__tixrepoTrafficOrigin,'verification_'+role);assert.equal(r.w.dataLayer.length,0);}
});
test('ordinary visits still configure collection without leaking query strings',()=>{
 const r=run();assert.equal(r.w['ga-disable-G-TEST123'],false);assert.equal(r.config.traffic_origin,'public_unmarked');assert.equal(r.config.page_location,'https://tixrepo.com/venues/belluna-dome');assert.equal(r.config.page_referrer,'https://chatgpt.com/');
});
test('a tagged external arrival passes the post identifier before the first page view',()=>{
 const r=run(null,null,'/venues/zozo-marine',{
  search:'?utm_source=x&utm_medium=social&utm_campaign=zozo-seat-guide&utm_content=post-01&token=private-query',
  referrer:'https://t.co/',
 });
 assert.equal(r.config.campaign_source,'x');
 assert.equal(r.config.campaign_medium,'social');
 assert.equal(r.config.campaign_name,'zozo-seat-guide');
 assert.equal(r.config.campaign_content,'post-01');
 assert.equal(r.config.page_location,'https://tixrepo.com/venues/zozo-marine');
 assert.equal(r.config.page_referrer,'https://t.co/');
 assert.ok(!JSON.stringify(r.w.dataLayer).includes('private-query'));
});
test('incomplete or internal tags do not override the session source',()=>{
 for(const search of ['?utm_source=x','?utm_source=site&utm_medium=internal&utm_campaign=campaign','?utm_source=a%40example.com&utm_medium=social&utm_campaign=campaign']){
  assert.equal(run(null,null,'/',{search}).config.campaign_source,undefined);
 }
});
test('LINE and WeChat are observed independently of the referrer and respect QA exclusion',()=>{
 for(const [userAgent,eventName] of [['Safari Line/15.6.0/IAB','landing_in_line'],['Safari MicroMessenger/8.0.60','landing_in_wechat']]){
  const observed=run(null,null,'/',{userAgent,referrer:''});
  assert.deepEqual(observed.events,[eventName]);
  assert.equal(observed.config.campaign_source,undefined);
  assert.ok(!JSON.stringify(observed.w.dataLayer).includes(userAgent));
  assert.deepEqual(run(null,null,'/',{userAgent,referrer:'https://tixrepo.com/venues'}).events,[]);
  assert.deepEqual(run(current('codex'),null,'/',{userAgent,referrer:''}).events,[]);
 }
 assert.deepEqual(run(null,null,'/',{userAgent:'Safari Mobile',referrer:''}).events,[]);
});
test('legacy confirmation markers suppress both active and expired QA sessions',()=>{
 for(const offset of [1000,10800000])for(const role of ['codex','operator'] as const){const r=run(null,JSON.stringify(createVerificationMarker(role,now-offset)));assert.equal(r.w['ga-disable-G-TEST123'],true);assert.equal(r.config,undefined);}
});
test('explicit damaged browser opt-out remains blocked; absent marker is not inferred',()=>{
 for(const raw of ['broken','null','{}',current('other')]){assert.equal(classifyAnalyticsExclusion(raw,now),'unclassified');assert.equal(run(raw).config,undefined);assert.equal(run(raw).w['ga-disable-G-TEST123'],true);}
 assert.equal(classifyAnalyticsExclusion(null,now),null);
});
test('control page never emits a configuration even for normal visitors',()=>{const r=run(null,null,'/verification-access');assert.equal(r.config,undefined);assert.equal(r.w['ga-disable-G-TEST123'],true);});
test('another tab changing the browser opt-out immediately blocks and reloads this tab',()=>{
 const r=run();r.listeners.storage({key:'unrelated'});assert.equal(r.reloads(),0);r.listeners.storage({key:'tixrepo.analytics-exclusion.v1'});assert.equal(r.w['ga-disable-G-TEST123'],true);assert.equal(r.reloads(),1);
});
test('untrusted measurement IDs cannot enter executable bootstrap',()=>assert.throws(()=>gaBootstrapScript("G-X';alert(1)")));
