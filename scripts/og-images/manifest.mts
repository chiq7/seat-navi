// Share-image (OGP) manifest: what render.py should draw for each venue page and each shareable seat block.
// usage: node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/og-images/manifest.mts > <out.json>
// A venue's shareable blocks are those of the seat map it opens with (its default mode); the share page also
// needs that mode to open the right map.
import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { kArenaLevels, kArenaStandSeats } from "../../src/data/venueGuides/k-arena/config.ts";
import { getVenuePageContent } from "../../src/lib/venuePageMetadata.ts";
import { VENUES as SEO_VENUES } from "../../src/lib/eventCrawlerConfig.ts";
import { seatViewPosts } from "../../src/lib/seatViewPosts.ts";
import { blockLongName, blockShortName, rowSummary } from "../../src/components/venue/template/seatLabels.ts";
import { resolveArenaView, type ArenaGuideDefinition } from "../../src/components/venue/guides/arenaDefinition.ts";
import type { StandMapData } from "../../src/components/venue/template/standMap.ts";

type Level = { id: string; label: string; color: string };
const root = path.resolve(import.meta.dirname, "../..");
const arenaDir = path.join(root, "src/components/venue/guides/arenaData");
const maps: Record<string, { seats: StandMapData; levels: Level[]; mode: string }> = {
  "k-arena": { seats: kArenaStandSeats as unknown as StandMapData, levels: kArenaLevels, mode: "fixed" },
};
for (const file of readdirSync(arenaDir).filter(name => name.endsWith(".ts"))) {
  const definition = (await import(pathToFileURL(path.join(arenaDir, file)).href)).default as ArenaGuideDefinition;
  const mode = definition.initialMode ?? "fixed";
  const view = resolveArenaView(definition, mode);
  maps[definition.venueId] = { seats: view.seats, levels: view.levels as Level[], mode };
}
const names = new Map(SEO_VENUES.map(venue => [venue.id, venue.name]));
const nameOf = (id: string) => {
  const { displayName, photos } = getVenuePageContent(id, names.get(id) ?? id);
  return { name: displayName.split(/[（(]/, 1)[0].trim(), photos: photos?.count ?? 0 };
};
const drawing = (seats: StandMapData, levels: Level[]) => ({
  viewBox: seats.viewBox,
  // No fixed stage side for most venues; draw the stage bar only where the map itself is drawn stage-up.
  stageUp: seats.frontLabel === undefined && !seats.zones,
  blocks: seats.blocks.map(block => ({ id: block.id, path: block.path, color: levels.find(level => level.id === block.level)?.color ?? "#d9c7d0", center: block.center })),
});
const venues = Object.entries(maps).filter(([id]) => names.has(id))
  .map(([id, { seats, levels, mode }]) => ({ id, mode, diagram: seats.diagramId, ...nameOf(id), ...drawing(seats, levels) }));
const seats = Object.fromEntries(venues.map(({ id }) => {
  const { seats: data, levels } = maps[id];
  const withPhotos = new Set(seatViewPosts(data.diagramId).filter(post => post.place.kind === "section").map(post => post.place.id));
  return [id, data.blocks.map(block => ({ id: block.id, title: blockLongName(block, data.blocks, levels), short: blockShortName(block, data.blocks),
    rows: rowSummary(block), photos: withPhotos.has(block.id) }))];
}));
process.stdout.write(JSON.stringify({ venues, seats }));
