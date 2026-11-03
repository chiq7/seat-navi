import { localOperationsRepository } from "./localOperations";
import { PILOT_EVENT } from "./pilot";
import path from "node:path";
// Entry used by local API mutations; the explicit scheduler endpoint handles production retries.
export async function prepareLocalCampaignUpdate() {
  const root=path.join(process.cwd(),"research/seat-campaign-production-2026-11-01/local-only",PILOT_EVENT.id);
  return localOperationsRepository(root).prepare(PILOT_EVENT,[],true,true);
}
