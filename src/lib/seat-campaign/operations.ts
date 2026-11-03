import { createHash } from "node:crypto";
import { summarizeCampaign, type CampaignEvent, type CampaignReport, type CampaignSummary, type KnownBlock } from "./model";
import { xCampaignDrafts } from "./clientFlow";

export type ReviewDecision = "received" | "accepted" | "rejected";
export type ReviewRequest = { id: string; expectedVersion: string; decision: ReviewDecision; reason: string; evidenceUrl: string };
export type ReviewReport = CampaignReport & { version: string; reason?: string; evidenceUrl?: string; acquisition?: Acquisition };
import { acquisition, type Acquisition } from "./attribution";
export function parseReview(value: unknown): ReviewRequest {
  const v = value as ReviewRequest;
  if (!v || !/^[a-f0-9-]{36}$/i.test(v.id) || typeof v.expectedVersion !== "string" || v.expectedVersion.length > 100 || !["received", "accepted", "rejected"].includes(v.decision) || typeof v.reason !== "string" || v.reason.trim().length < 5 || v.reason.length > 500) throw new Error("対象・状態・確認理由（5〜500文字）を確認してください。");
  const evidenceUrl = String(v.evidenceUrl ?? "").trim();
  if (evidenceUrl && (!/^https:\/\//.test(evidenceUrl) || evidenceUrl.length > 1000)) throw new Error("根拠はhttps URLで入力してください。");
  if (v.decision === "accepted" && !evidenceUrl) throw new Error("確認済みにするには、照合した根拠URLが必要です。位置・配置の確定とは別です。");
  return { id: v.id, expectedVersion: v.expectedVersion, decision: v.decision, reason: v.reason.trim(), evidenceUrl };
}
export type UpdatePack = { id: string; eventId: string; revision: string; preparedAt: string; previousId: string | null; summary: CampaignSummary; added: number; removed: number; correction: boolean; drafts: ReturnType<typeof xCampaignDrafts>; postedAt?: string; postUrl?: string };
export function contentRevision(summary: CampaignSummary): string {
  return createHash("sha256").update(JSON.stringify([summary.event, summary.keys, summary.acceptedKeys ?? [], summary.selfSubmissions, summary.external.map(r => [r.originId, r.block, r.row, r.number]), summary.missingBlocks])).digest("hex");
}
export function prepareUpdate(summary: CampaignSummary, latest: UpdatePack | null, posted: UpdatePack | null, now: string, localOnly: boolean, automatic = false): UpdatePack | null {
  const revision = contentRevision(summary);
  if (latest?.revision === revision) return null;
  if (!summary.selfSubmissions && !posted && !latest) return null;
  // One immutable snapshot drives both image and text. Withdrawal/correction can produce a zero-count update.
  const before = new Set(posted?.summary.keys ?? []), current = new Set(summary.keys);
  const added = summary.keys.filter(k => !before.has(k)).length, removed = [...before].filter(k => !current.has(k)).length;
  const confirmedBefore = posted?.summary.acceptedKeys ?? [];
  const correction = removed > 0 || confirmedBefore.some(k => !(summary.acceptedKeys ?? []).includes(k));
  // Batch ordinary arrivals; a real correction to a posted snapshot is urgent.
  if(automatic && latest && !correction && Date.parse(now)-Date.parse(latest.preparedAt)<5*60_000)return null;
  const id = createHash("sha256").update(`${summary.event.id}:${revision}:${posted?.id ?? "initial"}:${latest?.id ?? "none"}`).digest("hex");
  return { id, eventId: summary.event.id, revision, preparedAt: now, previousId: posted?.id ?? null, summary, added, removed, correction, drafts: xCampaignDrafts(summary, localOnly, { added, removed, id, hasBaseline: Boolean(posted) }) };
}
export function postMetrics(event: CampaignEvent, reports: ReviewReport[]) {
  const groups = new Map<string, { source: string; postId: string; received: number; active: number; accepted: number; excluded: number; uniqueLocations: number }>();
  for (const r of reports) {
    const a = acquisition(r.acquisition), key = `${a.source}:${a.postId}`;
    const g = groups.get(key) ?? { ...a, received: 0, active: 0, accepted: 0, excluded: 0, uniqueLocations: 0 };
    g.received++; if (["received", "accepted"].includes(r.status)) g.active++; else g.excluded++;
    if (r.status === "accepted") g.accepted++; groups.set(key, g);
  }
  for (const g of groups.values()) g.uniqueLocations = summarizeCampaign(event, reports.filter(r => { const a = acquisition(r.acquisition); return a.source === g.source && a.postId === g.postId; }), new Date(0).toISOString()).selfLocations;
  return [...groups.values()];
}
export interface CampaignOperationsRepository {
  list(event: CampaignEvent): Promise<ReviewReport[]>;
  review(event: CampaignEvent, request: ReviewRequest): Promise<void>;
  updates(event: CampaignEvent): Promise<UpdatePack[]>;
  prepare(event: CampaignEvent, known: KnownBlock[], localOnly: boolean, automatic?: boolean): Promise<UpdatePack | null>;
  markPosted(event: CampaignEvent, id: string, url: string): Promise<void>;
}
export function validPostUrl(url: string) { return /^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]{1,30}\/status\/\d{1,30}$/.test(url); }
