import fs from "node:fs";
import path from "node:path";
import { renderCandidateReviewHtml, type CandidateReview } from "./xFanCandidates.ts";

type CandidateFile = {
  artist: string;
  generatedAt: string;
  reviewed: CandidateReview[];
};

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(projectRoot, "x-fan-candidates");
const filename = process.argv[2];

if (!filename || path.basename(filename) !== filename || !filename.endsWith(".json")) {
  throw new Error("使い方: npm.cmd run render:x-fan-candidate-review -- le-sserafim-YYYY-MM-DD.json");
}

const inputPath = path.join(outputDir, filename);
if (!fs.existsSync(inputPath)) throw new Error(`候補ファイルが見つかりません: ${filename}`);

const source = JSON.parse(fs.readFileSync(inputPath, "utf8")) as CandidateFile;
const outputFilename = filename.replace(/\.json$/, ".html");
fs.writeFileSync(path.join(outputDir, outputFilename), renderCandidateReviewHtml(source), "utf8");
console.log(`確認ページを x-fan-candidates/${outputFilename} に作成しました。`);
