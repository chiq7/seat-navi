// Block names for "この席を送る" links at Tokyo Dome and Kyocera Dome (their seat maps are not StandSeatMap,
// so manifest.mts / render.py do not cover them). Writes src/data/seatShareDomeNames.json.
// usage: node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/og-images/domeNames.mts
// The names match what the full-screen map's top bar shows for the block.
import { writeFileSync } from "node:fs";
import path from "node:path";
import geometry from "../../src/data/tokyoDomeSeatGeometry.json" with { type: "json" };
import { TOKYO_DOME_SHAPE_CORRECTIONS } from "../../src/data/tokyoDomeSeatShapeCorrections.ts";
import { kyoceraDomeGuide } from "../../src/data/venueGuides/kyocera-dome/index.ts";
import { kyoceraBlockName, kyoceraDrawingBlocks } from "../../src/components/venue/guides/kyoceraMapDrawing.ts";

const root = path.resolve(import.meta.dirname, "../..");
const TOKYO_ZONES: Record<string, string> = { A: "1階 前方", B: "1階 後方", C: "バルコニー", D: "2階 前方", E: "2階 後方", F: "外野" };
const tokyo = Object.fromEntries((geometry.sections as { code: string; shared: boolean }[])
  .filter(area => !area.shared || TOKYO_DOME_SHAPE_CORRECTIONS[area.code])
  .map(area => [area.code, TOKYO_ZONES[area.code[0]] ? `${TOKYO_ZONES[area.code[0]]}・${area.code}` : area.code]));
const kyoceraBlocks = kyoceraDrawingBlocks(kyoceraDomeGuide);
const kyocera = Object.fromEntries(kyoceraBlocks.map(block => [block.code, kyoceraBlockName(block, kyoceraBlocks)]));
const kyoceraNames = Object.values(kyocera);
if (new Set(kyoceraNames).size !== kyoceraNames.length) console.warn("kyocera-dome: some blocks share a name");
const names = {
  "tokyo-dome": { name: "東京ドーム", mode: "fixed", blocks: tokyo },
  "kyocera-dome": { name: kyoceraDomeGuide.name, mode: "fixed", blocks: kyocera },
};
writeFileSync(path.join(root, "src/data/seatShareDomeNames.json"), JSON.stringify(names, null, 0) + "\n", "utf-8");
console.log(`tokyo-dome ${Object.keys(tokyo).length} blocks, kyocera-dome ${Object.keys(kyocera).length} blocks`);
