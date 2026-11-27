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
  assert.equal(seatPhotoCaption("2026年11月15日・YOASOBI"), "2026年11月15日・YOASOBI");
});

test("the Tokyo D22 fixed stand example does not inherit an unrecorded performance or date", () => {
  const [match] = seatViewMatchesForSelection(seatViewPosts("tokyo-dome-fixed"), { diagram: "tokyo-dome-fixed", request: 1, section: "D22" });
  assert.equal(photoSelectionCaption(match), "");
});

test("a caption is the stored show and nothing else: no 'unknown', 'reference' or 'verified' notes", () => {
  assert.equal(seatPhotoCaption("2024 MAMA AWARDS"), "2024 MAMA AWARDS");
  assert.equal(seatPhotoCaption(" 2026年2月14日 "), "2026年2月14日");
  assert.equal(seatPhotoCaption(undefined), "");
});

