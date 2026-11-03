import { readReceipt, receiptKey, type Receipt } from "./clientFlow";
import type { CampaignEvent } from "./model";

export type ManagedReceipt = Receipt & { state: "pending" | "saved"; recordedAt: string };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
const prefix = (eventId: string) => `tixrepo:seat-campaign:receipts:v2:${eventId}:`;
export const RECEIPTS_CHANGED = "tixrepo:campaign-receipts";
export function receiptLedger(storage: StorageLike, event: CampaignEvent): ManagedReceipt[] {
  const result = new Map<string, ManagedReceipt>();
  const old = readReceipt(storage.getItem(receiptKey(event.id)), event);
  if (old) result.set(old.id, { ...old, state: "saved", recordedAt: "" });
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i); if (!key?.startsWith(prefix(event.id))) continue;
    const raw = storage.getItem(key), receipt = readReceipt(raw, event);
    if (!receipt) {
      const other=JSON.parse(raw??"null") as ManagedReceipt|null;
      if(other?.input?.eventId===event.id && (other.input.date!==event.date || other.input.session!==event.session))continue;
      throw new Error("投稿の管理情報を読み取れません。ブラウザのデータを消さずに再読込してください。");
    }
    const value = JSON.parse(raw!) as ManagedReceipt;
    if (!["pending", "saved"].includes(value.state) || !Number.isFinite(Date.parse(value.recordedAt))) throw new Error("投稿履歴を確認できません。");
    result.set(receipt.id, { ...receipt, state: value.state, recordedAt: value.recordedAt });
  }
  return [...result.values()].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
export function storeReceipt(storage: StorageLike, event: CampaignEvent, receipt: Receipt, state: ManagedReceipt["state"]) {
  if (!readReceipt(JSON.stringify(receipt), event)) throw new Error("公演と管理情報が一致しません。");
  const old = readReceipt(storage.getItem(receiptKey(event.id)), event);
  // Separate keys preserve other tabs' contributions. Never replace the entire ledger.
  if (old && !storage.getItem(prefix(event.id) + old.id)) storage.setItem(prefix(event.id) + old.id, JSON.stringify({ ...old, state: "saved", recordedAt: new Date().toISOString() }));
  const key = prefix(event.id) + receipt.id;
  storage.setItem(key, JSON.stringify({ ...receipt, state, recordedAt: new Date().toISOString() }));
  if (old) storage.removeItem(receiptKey(event.id));
}
export function removeReceipt(storage: StorageLike, event: CampaignEvent, id: string) {
  storage.removeItem(prefix(event.id) + id);
  if (readReceipt(storage.getItem(receiptKey(event.id)), event)?.id === id) storage.removeItem(receiptKey(event.id));
}
