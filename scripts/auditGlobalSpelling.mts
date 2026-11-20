import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { SEARCH_SPELLING_ENTITIES } from "../src/lib/searchSpellingCatalog.ts";
import { getSearchNameSuggestions, getSearchSpellingCandidates } from "../src/lib/searchSpellingSuggestion.ts";
import { parseSearchQuery } from "../src/lib/searchQuery.ts";

const same = (a: {kind:string;id:string},b:{kind:string;id:string}) => a.kind === b.kind && a.id === b.id;
const resolve = (entity: typeof SEARCH_SPELLING_ENTITIES[number], name: string) => {
 const query = entity.kind === "intent" ? "Number_i " + name : name;
 const parsed = parseSearchQuery(query);
 return entity.kind === "artist" ? parsed.artistSlugs.includes(entity.id) : entity.kind === "venue" ? parsed.venueIds.includes(entity.id) :
 entity.kind === "region" ? parsed.regionIds.includes(entity.id) : entity.kind === "intent" ? parsed.intentIds.some(id=>id===entity.id) :
 getSearchNameSuggestions(query).some(row=>row.href==="/"&&!row.correction);
};
const aliasRows = [],typoRows=[],times=[];
for (const entity of SEARCH_SPELLING_ENTITIES) {
 for(const name of entity.names){
  const collision=SEARCH_SPELLING_ENTITIES.filter(other=>!same(entity,other)&&other.names.includes(name)).map(other=>({kind:other.kind,id:other.id,title:other.title}));
  aliasRows.push({kind:entity.kind,id:entity.id,title:entity.title,name,resolved:resolve(entity,name),collisions:collision});
 }
 const candidates=entity.names.filter(name=>name.length>=4&&name.length<=40).sort((a,b)=>b.length-a.length);
 const name=candidates[0]??entity.names.find(name=>name.length>=3);
 if(!name){typoRows.push({kind:entity.kind,id:entity.id,reason:"short aliases need more context"});continue;}
 // These transformations are independent of the matcher: deletion, insertion, substitution, transposition.
 const at=Math.floor(name.length/2);
 const mutations=[
 {kind:"omission",value:name.slice(0,at)+name.slice(at+1)},
 {kind:"insertion",value:name.slice(0,at)+"x"+name.slice(at)},
 {kind:"substitution",value:name.slice(0,at)+"x"+name.slice(at+1)},
 {kind:"transposition",value:name.slice(0,at-1)+name[at]+name[at-1]+name.slice(at+1)},
 ];
 for(const mutation of mutations){
  if(mutation.value===name||mutation.value.length<3)continue;
  const before=performance.now(); const matches=getSearchSpellingCandidates(mutation.value); times.push(performance.now()-before);
  const found=matches.some(match=>same(match.entity,entity));
  const query=entity.kind==="intent" ? "Number_i "+mutation.value : mutation.value;
  const suggestions=getSearchNameSuggestions(query);
  const suggested=resolve(entity,mutation.value)||suggestions.some(suggestion=>{
   if(entity.href&&suggestion.href===entity.href)return true;
   const corrected=new URL(suggestion.href,"https://tixrepo.com").searchParams.get("q");
   return corrected ? resolve(entity,corrected.startsWith("Number_i ")&&entity.kind==="intent" ? corrected.slice(9):corrected):false;
  });
  typoRows.push({kind:entity.kind,id:entity.id,title:entity.title,name,mutation:mutation.kind,input:mutation.value,candidateFound:found,candidates:matches.map(match=>({kind:match.entity.kind,id:match.entity.id,distance:match.distance})),suggested,
  exactOther:matches.some(match=>match.distance===0&&!same(match.entity,entity)),ambiguous:matches.length>1});
 }
}
times.sort((a,b)=>a-b);
const failures=aliasRows.filter(row=>!row.resolved&&!row.collisions.length);
const gaps=typoRows.filter(row=>"candidateFound"in row&&row.candidateFound&&!row.suggested&&!row.exactOther);
const summary={at:new Date().toISOString(),entities:SEARCH_SPELLING_ENTITIES.length,aliases:aliasRows.length,exactResolved:aliasRows.filter(row=>row.resolved).length,unresolvedWithoutCollision:failures.length,
ambiguousAliases:aliasRows.filter(row=>!row.resolved&&row.collisions.length).length,typoCases:typoRows.length,typoCandidatesFound:typoRows.filter(row=>row.candidateFound).length,
suggestionsFound:typoRows.filter(row=>row.suggested).length,uiGaps:gaps.length,distanceP95ms:times[Math.floor(times.length*.95)],distanceMaxMs:times.at(-1)};
fs.writeFileSync(new URL("../../coverage-all.json",import.meta.url),JSON.stringify({summary,aliases:aliasRows,typos:typoRows,failures,gaps},null,2));
console.log(JSON.stringify({summary,failures:failures.slice(0,24),gaps:gaps.slice(0,12)}));
