import assert from "node:assert/strict";
import test from "node:test";
import { photoSelectionCaption, seatPhotoCaption } from "@/lib/seatPhotoCaption";
import { getEventArenaPhotoLayout } from "@/lib/eventArenaPhotos";
import { seatViewMatchesForSelection, seatViewPosts } from "@/lib/seatViewPosts";

test("the Sapporo C2 event label preserves the original block without verifying its seat", () => {
  const layout = getEventArenaPhotoLayout({ id: "52a4927231b268c52cc6", date: "2026-11-15", venue_id: "sapporo-dome" });
  const photo = layout?.photos.find(entry => entry.block === "C2");
  assert.ok(photo);
  assert.notEqual(photo.seatVerified, true);
  assert.equal(seatPhotoCaption("2026年11月15日・YOASOBI", photo.seatVerified, "この公演の同じブロック"),
    "2026年11月15日・YOASOBI ｜ この公演の同じブロック ｜ 撮影位置は投稿者申告（参考）");
});

test("the Tokyo D22 fixed stand example does not inherit an unrecorded performance or date", () => {
  const [match] = seatViewMatchesForSelection(seatViewPosts("tokyo-dome-fixed"), { diagram: "tokyo-dome-fixed", request: 1, section: "D22" });
  assert.equal(photoSelectionCaption(match), "撮影公演・日付は不明 ｜ 同じブロックの参考写真 ｜ 撮影位置は投稿者申告（参考）");
});

test("captions keep a source's known name or date without inventing the other", () => {
  assert.match(seatPhotoCaption("2024 MAMA AWARDS", true), /MAMA AWARDS（撮影日不明） ｜ 座席番号を照合済み/);
  assert.match(seatPhotoCaption("2026年2月14日", false), /2月14日（公演名不明）/);
  assert.match(seatPhotoCaption("2024-12-01 Vaundy「FUSION」", false, "過去公演の同じブロックの参考写真"), /2024-12-01 Vaundy「FUSION」 ｜ 過去公演の同じブロックの参考写真/);
});

