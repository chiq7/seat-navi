import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseSeatInput, summarizeCampaign, type CampaignBaseline, type CampaignEvent, type CampaignReport, type KnownBlock } from "./model";

const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const missing = (e: unknown) => (e as NodeJS.ErrnoException).code === "ENOENT";
async function readJson(file: string) { return JSON.parse(await fs.readFile(file, "utf8")); }
async function appendJson(dir: string, id: string, value: unknown) {
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `${randomUUID()}.tmp`), target = path.join(dir, `${id}.json`);
  const handle = await fs.open(tmp, "wx");
  try { await handle.writeFile(JSON.stringify(value, null, 2) + "\n"); await handle.sync(); } finally { await handle.close(); }
  try { await fs.link(tmp, target); } finally { await fs.unlink(tmp); }
}
export async function readLocalCampaign(root: string, event: CampaignEvent, known: KnownBlock[] = []) {
  const dir = path.join(root, "reports");
  let files: string[];
  try { files = await fs.readdir(dir); } catch (e) { if (!missing(e)) throw e; files = []; }
  const reports: CampaignReport[] = [];
  for (const file of files.filter(f => f.endsWith(".json")).sort()) {
    const report = await readJson(path.join(dir, file));
    if (!idPattern.test(report.id) || file !== `${report.id}.json` || report.source !== "self" || report.status !== "received" || !Number.isFinite(Date.parse(report.createdAt))) throw new Error("保存済みデータを読み取れません。0件には置き換えません。");
    parseSeatInput(report, event); reports.push(report);
  }
  let startedAt: string;
  try { startedAt = (await readJson(path.join(root, "started.json"))).startedAt; }
  catch (e) {
    if (!missing(e)) throw e;
    try { await appendJson(root, "started", { startedAt: new Date().toISOString() }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    startedAt = (await readJson(path.join(root, "started.json"))).startedAt;
  }
  const updatedAt = reports.reduce((latest, row) => row.createdAt > latest ? row.createdAt : latest, startedAt);
  const summary = summarizeCampaign(event, reports, updatedAt, known);
  let baseline: CampaignBaseline | null = null;
  try {
    const names = (await fs.readdir(path.join(root, "baselines"))).filter(n => n.endsWith(".json")).sort();
    if (names.length) baseline = await readJson(path.join(root, "baselines", names[names.length - 1]));
  } catch (e) { if (!missing(e)) throw e; }
  if (baseline && (baseline.eventId !== event.id || baseline.date !== event.date || baseline.session !== event.session || !Array.isArray(baseline.keys) || baseline.keys.some(k => typeof k !== "string") || !Number.isFinite(Date.parse(baseline.savedAt)))) throw new Error("比較の基準を読み取れません。増減は表示しません。");
  return { event, summary, baseline, localOnly: true as const };
}
export async function saveLocalReport(root: string, event: CampaignEvent, id: unknown, input: unknown) {
  if (typeof id !== "string" || !idPattern.test(id)) throw new Error("送信IDが不正です。");
  const seat = parseSeatInput(input, event);
  const report: CampaignReport = { ...seat, id, createdAt: new Date().toISOString(), source: "self", status: "received" };
  try { await appendJson(path.join(root, "reports"), id, report); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    const existing = await readJson(path.join(root, "reports", `${id}.json`));
    if (JSON.stringify(parseSeatInput(existing, event)) !== JSON.stringify(seat)) throw new Error("同じ送信IDの内容が一致しません。既存内容は変更していません。");
    return { id, createdAt: existing.createdAt as string, repeated: true };
  }
  return { id, createdAt: report.createdAt, repeated: false };
}
export async function saveLocalBaseline(root: string, event: CampaignEvent, expectedRevision: unknown) {
  const { summary } = await readLocalCampaign(root, event);
  if (expectedRevision !== summary.revision) throw new Error("集計が変わっています。再読込してから基準を保存してください。");
  const baseline: CampaignBaseline = { eventId: event.id, date: event.date, session: event.session, keys: summary.keys, savedAt: new Date().toISOString() };
  await appendJson(path.join(root, "baselines"), `${Date.now()}-${randomUUID()}`, baseline);
  return baseline;
}
