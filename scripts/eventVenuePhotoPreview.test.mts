import assert from "node:assert/strict";
import test from "node:test";
import { getVenueArenaPhotoArchives } from "@/data/venueArenaPhotoArchives";
import { getPublicVenueGuideId, PUBLIC_VENUE_GUIDE_IDS } from "@/lib/publicVenueGuides";
import { getEventVenuePhotoPreview, getRenderedEventPhotos, getSeatPhotoVenues } from "@/lib/serverSeatPhotoVenues";
import { getEventArenaPhotoLayout } from "@/lib/eventArenaPhotos";
import { seatViewInlinePhotoUrl } from "@/lib/seatViewPhotoAssets";
import { seatViewPosts } from "@/lib/seatViewPosts";
import { getTokyoDomeVerifiedSeatBlock } from "@/lib/tokyoDomeSeatLocator";
import { resolveArenaSeatLink } from "@/components/venue/guides/arenaDefinition";
import { resolveStandSeatSection } from "@/components/venue/template/standMap";
import { kArenaStandSeats } from "@/data/venueGuides/k-arena/config";
import { kyoceraDomeGuide } from "@/data/venueGuides/kyocera-dome";
import { kyoceraDrawingBlocks } from "@/components/venue/guides/kyoceraMapDrawing";

test("canonical venue aliases, official names, unpublished guides and empty venues", () => {
  const fukuoka = getEventVenuePhotoPreview("fukuoka-paypay-dome");
  assert.equal(fukuoka?.href, "/venues/paypay-dome");
  assert.deepEqual(fukuoka, getEventVenuePhotoPreview("paypay-dome"));
  assert.equal(getEventVenuePhotoPreview(null, "KYOCERA DOME OSAKA")?.id, "kyocera-dome");
  assert.equal(getEventVenuePhotoPreview("other", "マリンメッセ福岡B館"), null);
  assert.deepEqual(getEventVenuePhotoPreview("edion-arena"), {
    id: "edion-arena", name: "エディオンアリーナ大阪", href: "/venues/edion-arena", count: 0, photos: [],
  });
});

test("all guides count each reviewed fixed-seat or venue-archive photo once and expose small previews only", () => {
  const stands = new Map(getSeatPhotoVenues().map(v => [v.id, v.count]));
  for (const id of PUBLIC_VENUE_GUIDE_IDS) {
    const preview = getEventVenuePhotoPreview(id)!;
    const archives = new Set(getVenueArenaPhotoArchives(id).flatMap(a =>
      a.layout.photos.map(p => seatViewInlinePhotoUrl(p))));
    assert.equal(preview.count, (stands.get(id) ?? 0) + archives.size, id);
    assert.equal(preview.photos.length, Math.min(preview.count, 6), id);
    assert.equal(new Set(preview.photos.map(p => p.thumbnailUrl)).size, preview.photos.length);
    for (const p of preview.photos) {
      const image = new URL(p.thumbnailUrl);
      assert.ok(image.hostname === "pbs.twimg.com" && image.searchParams.get("name") === "thumb" ||
        image.hostname === "assets.st-note.com" && image.searchParams.get("width") === "240", p.thumbnailUrl);
      assert.ok(p.label.trim());
      assert.equal(new URL(p.href, "https://tixrepo.com").pathname, `/venues/${id}`);
    }
  }
  assert.ok(getEventVenuePhotoPreview("toki-messe")!.photos.every(p => p.href.includes("#arena-seat-photos-") || p.href.includes("seatMode=exhibition")));
  assert.ok(getEventVenuePhotoPreview("koshien")!.photos.some(p => p.thumbnailUrl.startsWith("https://assets.st-note.com/")));
});

test("an event counts eligible venue previews and on-map photos once across both resolutions", () => {
  const layout = getEventArenaPhotoLayout({id:"52a4927231b268c52cc6",date:"2026-11-15",venue_id:"sapporo-dome"});
  assert.ok(layout);
  const full = seatViewInlinePhotoUrl(layout.photos[0])!;
  const thumb = new URL(full);
  assert.equal(thumb.hostname,"pbs.twimg.com");
  thumb.search = "?name=thumb&format=webp";
  const tokyo = getEventVenuePhotoPreview("tokyo-dome")!;
  const overlapping = { ...tokyo, photos: [ { ...tokyo.photos[0], thumbnailUrl: thumb.href }, ...tokyo.photos.slice(1,5) ] };
  assert.deepEqual(getRenderedEventPhotos(layout,overlapping,3), {showPreview:true,count:5});
  for (const reports of [4,null]) assert.deepEqual(getRenderedEventPhotos(layout,overlapping,reports), {showPreview:false,count:1});
  assert.deepEqual(getRenderedEventPhotos(null,tokyo,0), {showPreview:true,count:6});
});

test("Tokyo chooses the most recently posted photo of six different public blocks in date order", () => {
  const posts = seatViewPosts("tokyo-dome-fixed").slice().sort((a, b) =>
    Number(BigInt(b.url.split("/").at(-1)!) - BigInt(a.url.split("/").at(-1)!)));
  const unique = new Map<string, string>();
  for (const post of posts) {
    if (!unique.has(post.place.id)) unique.set(post.place.id, new URL(seatViewInlinePhotoUrl(post)!).pathname);
  }
  assert.deepEqual(getEventVenuePhotoPreview("tokyo-dome")!.photos.map(photo => [
    new URL(photo.href, "https://tixrepo.com").searchParams.get("seatSection"), new URL(photo.thumbnailUrl).pathname,
  ]), [...unique].slice(0, 6));
});

test("each deep link can select a real section in the public map's own mode or an existing arena archive", async () => {
  const kyoceraBlocks = kyoceraDrawingBlocks(kyoceraDomeGuide);
  for (const id of PUBLIC_VENUE_GUIDE_IDS) {
    const preview = getEventVenuePhotoPreview(id)!;
    assert.equal(getPublicVenueGuideId(preview.id), id);
    for (const photo of preview.photos) {
      const url = new URL(photo.href, "https://tixrepo.com");
      const section = url.searchParams.get("seatSection");
      if (!section) {
        if (url.hash !== "#venue-seat-guide")
          assert.ok(getVenueArenaPhotoArchives(id).some(a => url.hash === `#arena-seat-photos-${a.id}`));
        continue;
      }
      const mode = url.searchParams.get("seatMode")!;
      if (id === "tokyo-dome") assert.ok(getTokyoDomeVerifiedSeatBlock(section), section);
      else if (id === "kyocera-dome") assert.ok(kyoceraBlocks.some(b => b.code === section), section);
      else if (id === "k-arena") assert.ok(resolveStandSeatSection(kArenaStandSeats, section), section);
      else {
        const definition = (await import(`@/components/venue/guides/arenaData/${id}`)).default;
        assert.deepEqual(resolveArenaSeatLink(definition, { mode, section }), { mode, section }, photo.href);
      }
    }
  }
});
