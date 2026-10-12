import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { arenaAccessEntries } from "../../src/lib/venueAccess.ts";
import { searchStandSeats, boundsOf } from "../../src/components/venue/template/standMap.ts";
import { kyoceraAreaCamera, kyoceraDrawingBlocks } from "../../src/components/venue/guides/kyoceraMapDrawing.ts";
import { kyoceraDomeGuide } from "../../src/data/venueGuides/kyocera-dome/index.ts";

const directory = new URL("../../src/components/venue/guides/arenaData/", import.meta.url);
const definitions = await Promise.all(readdirSync(directory).filter(file => file.endsWith(".ts")).map(async file => (await import(new URL(file, directory).href)).default));

test("23会場のアクセスを確認済みの駅IDへ結び、不明点は公式ページへ残す", () => {
  assert.equal(definitions.length, 23);
  for (const {data} of definitions) {
    const entries = arenaAccessEntries(data.guide, data.access, data.officialRouteUrl ?? data.accessUrl);
    assert.ok(entries.length >= data.access.length, data.guide.venueId);
    assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
    for (const entry of entries) {
      assert.ok(entry.time && entry.from && entry.sourceUrl);
      if (!entry.targetId) continue;
      const diagram=data.guide.diagrams.find(d=>d.id===entry.diagramId);
      assert.equal(diagram?.scope,"場外");
      assert.ok(diagram.landmarks.some(m=>m.id===entry.targetId),entry.id);
      if (data.facilities.outsideViews) assert.ok(data.facilities.outsideViews.some(v=>v.diagramId===entry.diagramId && (!v.landmarkIds || v.landmarkIds.includes(entry.targetId))),entry.id);
    }
    const reversed=arenaAccessEntries(data.guide,[...data.access].reverse(),data.accessUrl);
    const byOrigin=(entry:typeof entries[number])=>`${entry.from}|${entry.line}|${entry.exit}`;
    assert.deepEqual(new Map(reversed.map(entry=>[byOrigin(entry),entry.targetId])),new Map(entries.map(entry=>[byOrigin(entry),entry.targetId])));
    const unknown=arenaAccessEntries(data.guide,[["未確認の駅", "未確認の出口", "時間未確認"]],data.accessUrl);
    assert.equal(unknown[0].targetId,undefined);
  }
});

test("主要通常席は区画名なしの列・番号で検索でき、階の拡大範囲も実在する席から作る", () => {
  for (const definition of definitions) {
    const modes=definition.modes?.options.map(mode=>mode.id) ?? [definition.initialMode ?? "fixed"];
    for (const mode of modes) {
      const view=definition.resolveMode?.(mode) ?? definition.data;
      for (const level of view.levels) {
        const blocks=view.seats.blocks.filter(b=>b.level===level.id);
        assert.ok(blocks.length,`${definition.venueId}/${mode}/${level.id}`);
        assert.ok(boundsOf(blocks).every(Number.isFinite));
        const block=blocks.find(b=>b.rows.some(row=>row.segments.length));
        if (!block) continue;
        const row=block.rows.find(row=>row.segments.length);
        const result=searchStandSeats(view.seats,level.id,"all",row.label,`${block.numberPrefix ?? ""}${row.segments[0].start}`);
        assert.ok(result.matches.some(m=>m.id===block.id),`${definition.venueId}/${mode}/${level.id}/${block.id}: ${result.error}`);
      }
    }
  }
});

test("京セラは全体方向からの上下段選択でも、その段の実在区画へ動く", () => {
  const blocks=kyoceraDrawingBlocks(kyoceraDomeGuide),whole=kyoceraDomeGuide.seatMap!.viewBox;
  for (const tier of ["上段","下段"]) {
    const box=kyoceraAreaCamera(blocks,whole,"all",tier);
    assert.notDeepEqual(box,whole);
    assert.ok(blocks.some(b=>b.tier===tier && Math.abs(b.x-box[0]-box[2]/2)<1 && Math.abs(b.y-box[1]-box[3]/2)<1));
  }
});
