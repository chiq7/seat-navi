import fs from "node:fs";
import { SEARCH_SPELLING_ENTITIES } from "../src/lib/searchSpellingCatalog.ts";
import { parseSearchQuery } from "../src/lib/searchQuery.ts";
import { getSearchNameSuggestions } from "../src/lib/searchSpellingSuggestion.ts";
const rows = ["Number_i こうしきじょうほう", "東京ドム 座席", "Number_i 東京ドム 座席", "sno man 東京ドム 座席", "SnowMan東京ドム座席", "numebr_i Kアリーナ 2026-11-05 座席", "東京ドーム ろっか", "tokoy seat", "toukyoudomu zasekihyou", "とうきょうどーむ じゅにゅうしつ"].map(query => ({ query, parsed: parseSearchQuery(query), suggestions: getSearchNameSuggestions(query) }));
const counts=Object.fromEntries(["artist","venue","region","intent","site"].map(kind=>[kind,SEARCH_SPELLING_ENTITIES.filter(row=>row.kind===kind).length]));
const noLatin=SEARCH_SPELLING_ENTITIES.filter(row=>["artist","venue"].includes(row.kind)&&!row.names.some(name=>/^[a-z\d]+$/.test(name))).map(({kind,id,title})=>({kind,id,title}));
fs.writeFileSync(new URL("../../spelling-diagnosis.json",import.meta.url),JSON.stringify({counts,noLatin,rows},null,2));
console.log(JSON.stringify({counts,noLatin,rows}));
