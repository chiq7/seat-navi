import assert from "node:assert/strict";
import { test } from "node:test";
import { getSearchNameSuggestions, getSearchSpellingCandidates } from "../src/lib/searchSpellingSuggestion.ts";
import { parseSearchQuery } from "../src/lib/searchQuery.ts";
import { SEARCH_REGIONS, SEARCH_CONTENT_INTENTS } from "../src/lib/searchDiscovery.ts";
import { SEARCH_SPELLING_ENTITIES } from "../src/lib/searchSpellingCatalog.ts";

function corrected(query: string) {
 const candidates = getSearchNameSuggestions(query);
 assert.equal(candidates.length,1,query+" "+JSON.stringify(candidates));
 return new URL(candidates[0].href,"https://tixrepo.com").searchParams.get("q");
}
test("romanized and kana input covers every registered artist, venue, region and purpose",()=>{
 for(const entity of SEARCH_SPELLING_ENTITIES){
  for(const name of entity.names){
   const parsed=parseSearchQuery(entity.kind==="intent"?"Number_i "+name:name);
   const found=entity.kind==="artist"?parsed.artistSlugs.includes(entity.id):entity.kind==="venue"?parsed.venueIds.includes(entity.id):entity.kind==="region"?parsed.regionIds.includes(entity.id):entity.kind==="intent"?parsed.intentIds.some(id=>id===entity.id):getSearchNameSuggestions(name).some(item=>item.href==="/");
   assert.ok(found,entity.kind+" "+entity.id+" "+name);
  }
 }
 assert.equal(SEARCH_REGIONS.length,64); assert.equal(SEARCH_CONTENT_INTENTS.length,17);
});
test("one query can correct artist and venue while preserving date, equipment and requested seat",()=>{
 const query="sno man 東京ドム 2026-11-05 座席 D22 10列";
 const result=corrected(query)!;
 assert.equal(result,"Snow Man 東京ドーム 2026-11-05 座席 D22 10列");
 const parsed=parseSearchQuery(result);
 assert.deepEqual(parsed.artistSlugs,["snow-man"]);assert.deepEqual(parsed.venueIds,["tokyo-dome"]);assert.deepEqual(parsed.dates,["2026-11-05"]);
 assert.equal(corrected("Number_i 東京ドム 座席"),"Number_i 東京ドーム 座席");
 assert.equal(corrected("東京ドーム ろっか"),"東京ドーム ロッカー");
});
test("all four error classes apply to identities instead of a hand-picked allowlist",()=>{
 for(const entity of SEARCH_SPELLING_ENTITIES){
  const name=entity.names.find(name=>name.length>=4&&name.length<=40);
  if(!name)continue;
  const p=Math.floor(name.length/2);
  const inputs=[name.slice(0,p)+name.slice(p+1),name.slice(0,p)+"x"+name.slice(p),name.slice(0,p)+"x"+name.slice(p+1),name.slice(0,p-1)+name[p]+name[p-1]+name.slice(p+1)];
  for(const input of inputs)assert.ok(getSearchSpellingCandidates(input).some(row=>row.entity.kind===entity.kind&&row.entity.id===entity.id),entity.id+" "+input);
 }
});
test("ambiguous short names are choices; exact names and unrelated inputs are not silently changed",()=>{
 const choices=getSearchNameSuggestions("axo");
 assert.deepEqual(new Set(choices.map(row=>row.href)),new Set(["/artists/ado","/artists/ano","/artists/exo"]));
 for(const query of ["Ado","ano","LIVE","IVE","東京タワー","D22","2026-11-05","公式情報"])assert.deepEqual(getSearchNameSuggestions(query),[],query);
 assert.ok(getSearchSpellingCandidates("sakurazka64").some(row=>row.entity.id==="sakurazaka46"&&row.distance===2));
});
test("complete purpose words do not turn into venue nicknames, including attached input",()=>{
 for(const query of ["Number_i こうしきじょうほう","Number_iこうしきじょうほう"]){
 const parsed=parseSearchQuery(query);assert.deepEqual(parsed.artistSlugs,["number-i"]);assert.deepEqual(parsed.venueIds,[]);assert.ok(parsed.intentIds.includes("news"));
 }
 assert.ok(getSearchNameSuggestions("ekopariina").some(row=>row.href==="/venues/ecopa-arena"||row.title==="エコパアリーナ"));
 assert.ok(getSearchNameSuggestions("まくはりめっせこくさいてんじじょういからじゅういちほーるいべんとほーる").some(row=>row.title.includes("1～11")));
});
