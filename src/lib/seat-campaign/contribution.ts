import { acquisition, type Acquisition } from "./attribution";
import { VERIFIED_CAMPAIGN_LAYOUTS } from "./verifiedLayouts";
import { createHash } from "node:crypto";
import { parseSeatInput, summarizeCampaign, type CampaignEvent, type CampaignReport, type CampaignSummary, type SeatInput } from "./model";

export type CampaignState = { event: CampaignEvent; summary: CampaignSummary; baseline: null; localOnly: boolean };
export type Contribution = { id: string; input: SeatInput; ownerHash: string; rateHash: string; participantHash?: string; acquisition?: Acquisition };
export type SavedContribution = { id: string; repeated: boolean; withdrawn: boolean };
export interface ContributionRepository {
  read(event: CampaignEvent): Promise<{ reports: CampaignReport[]; updatedAt: string; version?: string }>;
  submit(event: CampaignEvent, value: Contribution): Promise<SavedContribution>;
  withdraw(event: CampaignEvent, id: string, ownerHash: string): Promise<SavedContribution>;
}
export class CampaignError extends Error {
  code: "invalid" | "conflict" | "not_found" | "rate_limited" | "unavailable";
  constructor(code: CampaignError["code"], message: string) { super(message); this.code = code; }
}
export const validContributionId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function ownerHash(token: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new CampaignError("invalid", "投稿の管理情報を確認できません。");
  return createHash("sha256").update(token).digest("hex");
}
export async function campaignState(repository: ContributionRepository, event: CampaignEvent, localOnly: boolean): Promise<CampaignState> {
  const result = await repository.read(event);
  return { event, summary: summarizeCampaign(event, result.reports, result.updatedAt, (VERIFIED_CAMPAIGN_LAYOUTS[event.id]?.blocks ?? []).map(block => ({seatType:"arena",block,sourceUrl:VERIFIED_CAMPAIGN_LAYOUTS[event.id].sourceUrl}))), baseline: null, localOnly };
}
export async function campaignAction(repository: ContributionRepository, event: CampaignEvent, body: unknown, rateHash: string) {
  if (!body || typeof body !== "object") throw new CampaignError("invalid", "入力を確認してください。");
  const b = body as Record<string, unknown>;
  if (!validContributionId(b.id) || b.eventId !== event.id) throw new CampaignError("invalid", "公演と投稿IDを確認してください。");
  const hash = ownerHash(b.token);
  if (b.action === "withdraw") return repository.withdraw(event, b.id, hash);
  if (b.action !== "submit" || !/^[a-f0-9]{64}$/.test(rateHash)) throw new CampaignError("invalid", "操作を確認してください。");
  let input: SeatInput;
  try { input = parseSeatInput(b.input, event); } catch (error) { throw new CampaignError("invalid", error instanceof Error ? error.message : "入力を確認してください。"); }
  return repository.submit(event, { id: b.id, input, ownerHash: hash, rateHash, participantHash: b.clientToken ? ownerHash(b.clientToken) : rateHash, acquisition: acquisition(b.acquisition) });
}
export function campaignErrorStatus(error: unknown) { return error instanceof CampaignError ? ({ invalid:400, conflict:409, not_found:404, rate_limited:429, unavailable:503 }[error.code]) : 503; }
export function campaignOriginAllowed(origin: string | null, contentType: string | null, local: boolean) {
  return Boolean(contentType?.toLowerCase().startsWith("application/json") && (local ? ["http://127.0.0.1:3142","http://localhost:3142"].includes(origin ?? "") : origin === "https://tixrepo.com"));
}
export async function readCampaignBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > 8192) throw new CampaignError("invalid", "入力が長すぎます。");
  const reader = request.body?.getReader(); if (!reader) throw new CampaignError("invalid", "入力を確認してください。");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 8192) { await reader.cancel(); throw new CampaignError("invalid", "入力が長すぎます。"); } chunks.push(part.value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new CampaignError("invalid", "入力を確認してください。"); }
}
