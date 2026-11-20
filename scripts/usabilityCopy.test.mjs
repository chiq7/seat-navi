import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(import.meta.dirname, "..");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") return { url: "feed-test:link", shortCircuit: true };
    if (specifier === "next/image") return { url: "copy-test:image", shortCircuit: true };
    if (specifier === "@/lib/supabase/client") return { url: "copy-test:database", shortCircuit: true };
    const target = specifier.startsWith("@/") ? pathToFileURL(path.join(root, "src", specifier.slice(2))).href : specifier;
    if ((target.startsWith(".") || target.startsWith("file:")) && !path.extname(target)) {
      const base = new URL(target, context.parentURL);
      for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(fileURLToPath(base) + ext)) return nextResolve(base.href + ext, context);
    }
    return nextResolve(target, context);
  },
  load(url, context, nextLoad) {
    if (url === "copy-test:database") return { format: "module", shortCircuit: true, source: "export const supabase = {};" };
    if (url === "copy-test:image") return { format: "module", shortCircuit: true, source: `import React from ${JSON.stringify(pathToFileURL(path.join(root, "node_modules/react/index.js")).href)}; export default function Image({ unoptimized, fill, priority, ...props }) { return React.createElement("img", props); }` };
    if (url === "feed-test:link") return { format: "module", shortCircuit: true, source: `import React from ${JSON.stringify(pathToFileURL(path.join(root, "node_modules/react/index.js")).href)}; export default function Link(props) { return React.createElement("a", props); }` };
    if (url.endsWith(".css")) return { format: "module", shortCircuit: true, source: "export default new Proxy({}, { get: (_, key) => String(key) });" };
    if (url.endsWith(".json")) return { format: "module", shortCircuit: true, source: `export default ${readFileSync(new URL(url), "utf8")}` };
    if (/\.tsx?$/.test(url)) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText };
    return nextLoad(url, context);
  },
});
const { computeTicketResultStats, computeArenaDetailStats, computeUpgradeDetailStats } = await import('../src/lib/artistPageStats.ts');
const { reportedDiscoveryLottery } = await import('../src/lib/seatDiscovery.ts');
const { default: Trend } = await import('../src/components/artist-page/TrendSection.tsx');
const { default: Effects } = await import('../src/components/artist-page/LiveEffectsSection.tsx');
const { ReportTimelineList } = await import('../src/components/artist-page/ReportSection.tsx');
const { default: Actions } = await import('../src/components/artist-page/ArtistActionHub.tsx');
const { getSeatPhotoVenues, getArtistSeatPhotoVenues, getArtistSeatPhotos } = await import('../src/lib/serverSeatPhotoVenues.ts');
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const row = (overrides={}) => ({ id:'a',event_id:'show',user_id:null,result:'won',lost_application_count:0,ticket_count:1,lottery_type:'1次抽選',fc_history:'1年未満',payment_method:'クレカ',seat_type:'arena',upgrade_result:null,...overrides });

test('counts keep weighted lost applications and distinct arena/upgrade denominators without reversing rounded percentages',()=>{
 const rows=[row({lost_application_count:3,upgrade_result:'not_applied'}),row({id:'b',upgrade_result:'applied_won'}),row({id:'c',result:'lost',lost_application_count:2,seat_type:'unknown',fc_history:null})];
 const stats=computeTicketResultStats(rows);
 assert.deepEqual({won:stats.won,lost:stats.lost,total:stats.total,rate:stats.rate},{won:2,lost:5,total:7,rate:28.6});
 assert.equal(stats.normalArenaCount,1);assert.equal(stats.normalArenaWon,1);
 assert.equal(stats.upgradeCount,1);assert.equal(stats.upgradeWon,1);
 assert.deepEqual(stats.counts.fc[0],{won:2,lost:3,total:5,rate:40});
 assert.equal(computeArenaDetailStats(rows).fc.under1.total,1);
 assert.equal(computeUpgradeDetailStats(rows).fc.under1.won,1);
});

test('unanswered upgrades and seat categories without a physical area are excluded across artist and home stats',()=>{
 const rows=[
   row({id:'arena',upgrade_result:'not_applied'}),
   row({id:'stand',seat_type:'stand',upgrade_result:'applied_lost'}),
   row({id:'unanswered-upgrade'}),
   row({id:'unanswered-seat',seat_type:null,upgrade_result:'not_applied'}),
   row({id:'restricted',seat_type:'restricted',upgrade_result:'not_applied'}),
   row({id:'upgraded',upgrade_result:'applied_won'}),
 ];
 const stats=computeTicketResultStats(rows);
 assert.equal(stats.won,6);
 assert.equal(stats.arenaRate,75);
 assert.equal(stats.normalArenaCount,2);
 assert.equal(stats.normalArenaWon,1);
 assert.equal(stats.upgradeCount,2);
 assert.deepEqual(computeArenaDetailStats(rows).fc.under1,{rate:50,won:1,total:2});
 const summary=reportedDiscoveryLottery([{id:'show',venue:'会場',date:'2026-11-18'}],rows,rows.length);
 assert.deepEqual(summary.normalArena,{won:1,total:2});
 assert.deepEqual(summary.upgrade,{won:1,total:2});
 assert.equal(computeTicketResultStats([row()]).normalArenaRate,null);
});

test('small-sample summaries display exact counts, with percentages only in closed context disclosure',()=>{
 const rows=[row(),row({id:'b'})];const html=render(Trend,{ticketStats:computeTicketResultStats(rows),arenaStats:computeArenaDetailStats(rows),upgradeStats:computeUpgradeDetailStats(rows),reportCount:2});
 const visible=html.replace(/<details[\s\S]*?<\/details>/g,'').replace(/<[^>]*>/g,'');
 assert.doesNotMatch(visible,/%|n=|当選率/);assert.match(visible,/申込結果2件/);
 assert.match(html,/当選：2 \/ 2件（100%）/);assert.doesNotMatch(html,/<details[^>]*\bopen/);
 assert.match(html,/公式の当選確率ではありません/);
});

test('zero effects never implies observed performances; only reported categories are shown',()=>{
 const empty=render(Effects,{liveEffects:{}});assert.match(empty,/演出の報告はまだありません/);assert.doesNotMatch(empty,/見られた演出|<img|センターステージ/);
 const one=render(Effects,{liveEffects:{'center-stage':true}});assert.match(one,/報告された演出/);assert.match(one,/センターステージ/);assert.doesNotMatch(one,/トロッコ|銀テープ/);
});

test('empty report CTA remains an actionable readable link',()=>{
 const html=render(ReportTimelineList,{reports:[],reportHref:'/report/live?event=show'});
 assert.match(html,/href="\/report\/live\?event=show"/);assert.match(html,/現地レポを投稿する/);
 const color=html.match(/bg-\[#([a-f0-9]{6})\][^"]*text-white/)[1];
 const channels=color.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 const luminance=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;assert.ok(1.05/(luminance+.05)>=4.5);
});

test('venue alternatives remain distinct from photos verified for the performing artist',()=>{
 const available=getSeatPhotoVenues();assert.ok(available.length>0);assert.ok(available.every(v=>v.count>0&&v.href.endsWith('#venue-seat-guide')));
 assert.ok(!available.some(v=>['toki-messe','edion-arena'].includes(v.id)));
 const events=[{id:'sapporo',artist_slug:'yoasobi',title:'YOASOBI TOUR',date:'2099-11-14',venue:'札幌ドーム',venue_id:'sapporo-dome'},{id:'no-photo',artist_slug:'yoasobi',title:'YOASOBI TOUR',date:'2099-11-15',venue:'朱鷺メッセ',venue_id:'toki-messe'}];
 const choices=getArtistSeatPhotoVenues('yoasobi',events);assert.deepEqual(choices.map(x=>x.id),['sapporo-dome']);
 const photos = getArtistSeatPhotos('SEVENTEEN', []);
 assert.ok(photos.length > 0);
 assert.ok(photos.every(photo => /SEVENTEEN/i.test(photo.event) && photo.image && photo.source));
 assert.equal(new Set(photos.map(photo => photo.image)).size, photos.length);
 const withPhotos = render(Actions, {artistName:'SEVENTEEN', slug:'seventeen', photoCount:photos.length});
 assert.ok(withPhotos.includes('href="#artist-seat-photos"'));
 const base = { artistName:'YOASOBI', slug:'yoasobi', photoCount:0, seatHref:'#artist-seat-guide' };
 const nextVenuePhotos = { id:'sapporo-dome', name:'札幌ドーム', count:7 };
 const withReports = render(Actions, {...base, nextVenuePhotos, publicReportCount:2});
 assert.match(withReports, /href="\/artists\/yoasobi\/after-reports#artist-seat-reports"/);
 assert.match(withReports, /レポ2件/);
 const withoutReports = render(Actions, {...base, publicReportCount:0, nextVenuePhotos});
 assert.match(withoutReports,/href="\/venues\/sapporo-dome#venue-photo-list"/);
 assert.match(withoutReports,/公演写真0枚\s+札幌ドーム 7枚/);
 assert.doesNotMatch(withoutReports, /after-reports/);
 const directory = render(Actions,{...base, publicReportCount:0});
 assert.match(directory, /href="\/venues#seat-photos"/);
 const unknown = render(Actions,{...base, publicReportCount:null, nextVenuePhotos});
 assert.doesNotMatch(unknown, /公演写真0枚/);
 const tiles = [...withoutReports.matchAll(/<a href="([^"]+)"[\s\S]+?data-link-direction[^>]*>([↓→])<\/span>/g)];
 assert.equal(tiles.length, 5);
 for (const [,href, arrow] of tiles) assert.equal(arrow, href.startsWith('#') ? '↓' : '→');
});
