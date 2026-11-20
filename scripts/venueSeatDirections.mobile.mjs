import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

// Keep browser tooling outside the production runtime. Use an installed Playwright
// or supply its absolute module path through TIXREPO_PLAYWRIGHT.
const { chromium, devices } = createRequire(import.meta.url)(process.env.TIXREPO_PLAYWRIGHT || "playwright");
const origin = process.argv[2];
const evidenceDir = process.argv[3];
assert.ok(origin === "https://tixrepo.com" || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));
const cases = {
  "miyagi-arena": [["A","1","5","miyagi-a-front-1"],["B","1","5",null]],
  "belluna-dome": [["ネット裏","6","31","belluna-shape-344"],["1塁内野","6","31",null]],
  "nissan-stadium": [["バックスタンド","14","521","nissan-e25-1"],["メインスタンド","14","521",null]],
  "yokohama-arena": [["BC","1","2","B-front-1"],["AD","1","2",null]],
  "budokan": [["北","A","7","budokan-1F-北-0-0"],["北","C","5",null]],
  "ariake-arena": [["A","13","8","ariake-A-01"],["B","13","8",null],["E","21","10","ariake-E-02"],["G","21","121","ariake-G-15"],["F","２列","Ｆ１９９番","ariake-F-26"]],
  "k-arena": [["center","4","79","k-level3-01"],["left","4","79",null]],
  "edion-arena": [["A","A","1","edion-a-1"],["C","A","5",null]],
  "gaishi-hall": [["西","18","25","gaishi-F-stand-20"],["北","18","25",null]],
  "hiroshima-arena": [["F","12","44","hiroshima-f-front-3"],["A","12","44",null]],
  "koshien": [["ライト","22","9","koshien-reference-29"],["1塁側","22","9",null]],
  "makuhari-messe": [["A","9","51","makuhari-f2-a-1"],["B","9","51",null]],
  "marine-messe": [["南","8","10","marine-A-front-1"],["東","17","1",null]],
  "mufg-stadium": [["メインスタンド","19","1","mufg-block-101"],["バックスタンド","19","1",null]],
  "osaka-jo-hall": [["AN","1","34","A"],["BCD","1","34",null]],
  "paypay-dome": [["3塁側","9","149","paypay-front-26"],["1塁側","9","149",null]],
  "pia-arena-mm": [["L","6","1","2F-L-001"],["C","6","1",null]],
  "sapporo-dome": [["東側","19","61","sapporo-baseball-5"],["北側","19","61",null]],
  "tokyo-garden-theater": [["A","4","1","1A-front"],["I","9","8",null]],
  "vantelin-dome": [["バックネット側","25","L1","vantelin-number-L-1"],["1塁側","25","L1",null]],
  "yoyogi": [["北","10","19","yoyogi-n1A-1"],["北","11","30",null]],
  "zozo-marine": [["ライト","1","381","zozo-reference-22"],["1塁側","1","381",null]],
};
const targets = [...Object.keys(cases),"saitama-super-arena","toki-messe","tokyo-dome","kyocera-dome"];
const focused = process.argv.slice(4);
for (const venue of focused) assert.ok(targets.includes(venue),venue);
const queue = focused.length ? [...focused] : [...targets];
const browser = await chromium.launch({channel: process.env.CHROME_CHANNEL || "chrome"});
const result = {origin, when: new Date().toISOString(), width: 390, venues: {}};
if (evidenceDir) await fs.mkdir(evidenceDir, {recursive: true});
const context = await browser.newContext({...devices["Pixel 7"], viewport: {width: 390, height: 844},
  deviceScaleFactor: 1, reducedMotion: "reduce", locale: "ja-JP"});
await context.route("**/*", route => {
  const {hostname} = new URL(route.request().url());
  if (/google-analytics|googletagmanager|cloudflareinsights|doubleclick/.test(hostname) ||
      !["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.abort();
  return route.continue();
});
async function search(form,row,number) {
  await form.getByLabel("列", {exact:true}).fill(row);
  await form.getByLabel("座席番号", {exact:true}).fill(number);
  await form.getByRole("button",{name:"場所を見る"}).tap();
}
async function saveScreen(page,locator,filename) {
  if (!evidenceDir) return;
  await locator.evaluate(el=>el.scrollIntoView({block:"center"}));
  await page.screenshot({path:path.join(evidenceDir,filename+".png")});
}
async function common(page,venue,record) {
  const map=page.getByTestId("stand-seat-map").first();
  const scope=map.locator("xpath=ancestor::*[@data-seat-template][1]");
  if (venue==="toki-messe") {
    const form=scope.locator("[data-seat-finder-form]");
    await form.getByLabel("ブロック・区画名").waitFor();
    assert.equal(await form.getByLabel("座席番号",{exact:true}).count(),0);
    const note=await scope.locator("[data-seat-number-legend]").innerText();
    assert.match(note,/座席番号は未確認/);
    record.capability=note; return;
  }
  const direction=scope.getByRole("combobox",{name:"見る方向"});
  await scope.locator("select[aria-label='見る方向']:enabled option").first().waitFor({state:"attached"});
  const areas=await direction.locator("option").evaluateAll(options=>options.map(o=>o.value));
  if (venue==="saitama-super-arena") {
    assert.deepEqual(areas,["all"]);
    record.capability="図の方向は全体のみ"; return;
  }
  const form=scope.locator("[data-seat-finder-form]");
  for (const [area,row,number,expected] of cases[venue]) {
    await scope.getByRole("button",{name:"全体を見る",exact:true}).tap();
    await direction.selectOption(area);
    await search(form,row,number);
    if(expected) await scope.locator('[data-testid="stand-seat-map"][data-selected="'+expected+'"]').waitFor({state:"attached"});
    else await scope.locator("[data-seat-finder-miss] [role=alert]").waitFor();
    const actual=(await map.getAttribute("data-selected")) || null;
    const actualDirection=await direction.inputValue();
    const message=expected ? "" : await scope.locator("[data-seat-finder-miss] [role=alert]").innerText();
    assert.equal(actual,expected);
    assert.equal(actualDirection,area);
    if (!expected) assert.match(message,/見つかりません/);
    record.checks.push({area,row,number,expected,actual,direction:actualDirection,message});
  }
}
async function tokyo(page,record) {
  const frame=page.locator("#tokyo-dome-map-title").locator("xpath=ancestor::section[1]");
  const form=frame.locator("[data-seat-finder-form]");
  const direction=frame.locator("select").first();
  const selected=frame.locator('[aria-label="選んだ座席"]');
  for (const area of ["home","third","first","all"]) {
    await frame.getByRole("button",{name:"全体を見る",exact:true}).tap();
    await direction.selectOption(area); await search(form,"15","481");
    const selection=await selected.innerText();
    const alert=await frame.getByRole("alert").allInnerTexts();
    assert.equal(await direction.inputValue(),area);
    if(area==="first"||area==="all") {assert.match(selection,/A01/);assert.match(selection,/481番/);assert.deepEqual(alert,[]);}
    else {
      assert.doesNotMatch(selection,/A01/);
      const side=area==="home"?"ホーム側":"3塁側";
      assert.deepEqual(alert,[side+"では15列481番は見つかりませんでした。チケットの方向・階を確認するか、ブロック名で探してください。"]);
    }
    record.checks.push({area,row:"15",number:"481",selection,alert,direction:await direction.inputValue()});
    if(area==="home") await saveScreen(page,frame.getByRole("alert"),"tokyo-home-miss-390");
  }
  await frame.getByRole("button",{name:"全体を見る",exact:true}).tap();
  await direction.selectOption("third");
  // Zoom out while preserving the direction, then tap a hit-tested pixel of the actual D22 path.
  const map=frame.locator("div[data-view]");
  const block=frame.locator('path[data-seat-code="D22"]');
  let point;
  for (let i=0;i<9 && !point;i++) {
    if(i) await frame.getByRole("button",{name:"地図を縮小",exact:true}).tap();
    await map.evaluate(el=>el.scrollIntoView({block:"center"}));
    point=await block.evaluate(el=>{
      const {left,right,top,bottom}=el.getBoundingClientRect();
      for(let y=Math.max(0,Math.ceil(top));y<Math.min(window.innerHeight,bottom);y++)
        for(let x=Math.max(0,Math.ceil(left));x<Math.min(window.innerWidth,right);x++)
          if(document.elementFromPoint(x,y)?.closest("[data-seat-code]")?.getAttribute("data-seat-code")==="D22") return {x,y};
      return null;
    });
  }
  assert.ok(point,"No touch target for D22");
  await page.touchscreen.tap(point.x,point.y);
  const info=frame.getByRole("status").filter({hasText:"D22は1塁側の区画です。"});
  await info.waitFor();
  assert.equal(await direction.inputValue(),"third");
  assert.doesNotMatch(await selected.innerText(),/D22/);
  record.checks.push({action:"D22をタップ",point,direction:await direction.inputValue(),message:await info.innerText()});
  await saveScreen(page,info,"tokyo-d22-confirm-390");
  await frame.getByRole("button",{name:"1塁側に切り替えてD22を表示"}).tap();
  assert.equal(await direction.inputValue(),"first");assert.match(await selected.innerText(),/D22/);
  await frame.getByRole("status").filter({hasText:"1塁側に切り替えました。"}).waitFor();
  await direction.selectOption("third");
  await form.getByRole("button",{name:"区画名で探す"}).tap();
  await form.getByLabel("ブロック・区画名").fill("Ｄ２２");
  await form.getByRole("button",{name:"場所を見る"}).tap();
  assert.equal(await direction.inputValue(),"first");
  const switched=frame.getByRole("status").filter({hasText:"1塁側に切り替えました。"});
  await switched.waitFor();
  const picked=await selected.innerText(); assert.match(picked,/D22/);
  record.checks.push({action:"区画名でＤ２２",direction:await direction.inputValue(),selection:picked,message:await switched.innerText()});
  await saveScreen(page,switched,"tokyo-d22-search-390");
}
async function kyocera(page,rec) {
  const form=page.getByTestId("kyocera-ticket-search");
  const direction=form.locator("xpath=ancestor::*[.//select][1]").locator("select").first();
  for(const area of ["first","third"]) {
    await direction.selectOption(area);await search(form,"7","481");
    if(area==="first")assert.equal(await page.getByTestId("selected-block-numbers").getAttribute("data-block-code"),"X_TP_61");
    else await page.locator("[data-seat-finder-miss] [role=alert]").first().waitFor();
    assert.equal(await direction.inputValue(),area);
    rec.checks.push({area,row:"7",number:"481",direction:await direction.inputValue(),result:area==="first"?"X_TP_61":"該当なし"});
  }
}
try {
  await Promise.all([1,2].map(async()=>{
    const page=await context.newPage();page.setDefaultTimeout(15000);
    while (queue.length) {
      const venue=queue.shift(),rec={checks:[]};result.venues[venue]=rec;
      try{
        const res=await page.goto(origin+"/venues/"+venue,{waitUntil:"domcontentloaded",timeout:90000});
        assert.equal(res?.status(),200);
        await (venue==="tokyo-dome"?tokyo(page,rec):venue==="kyocera-dome"?kyocera(page,rec):common(page,venue,rec));
        rec.passed=true;
      }catch(error){rec.error=error.message;console.error(venue,rec.error);}
      console.log(venue,rec.checks.length,rec.passed?"PASS":"FAIL");
    }
    await page.close();
  }));
}finally{await browser.close();}
if (evidenceDir) await fs.writeFile(path.join(evidenceDir,"seat-directions-390.json"),JSON.stringify(result,null,2));
assert.ok(Object.values(result.venues).every(v=>v.passed),"One or more venue checks failed");

