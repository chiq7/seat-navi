import { queryAcquisition } from "./attribution";
import type { CampaignEvent, CampaignSummary, SeatInput } from "./model";
import { campaignRecruitmentLink } from "./presentation";

export type Receipt = { id: string; token: string; input: SeatInput };
export const receiptKey = (eventId: string) => `tixrepo:seat-campaign:receipt:${eventId}`;
export function readReceipt(raw: string | null, event: CampaignEvent): Receipt | null {
  try {
    const r = JSON.parse(raw ?? "null");
    if (!r || !/^[a-f0-9-]{36}$/.test(r.id) || !/^[a-f0-9]{64}$/.test(r.token) || r.input?.eventId !== event.id || r.input?.date !== event.date || r.input?.session !== event.session) return null;
    return r;
  } catch { return null; }
}
export function campaignLinks(eventId: string, localOnly: boolean) {
  const base = localOnly ? "/dev/seat-campaign" : `/seat-campaign/${encodeURIComponent(eventId)}`;
  return { form: `${base}?view=report`, summary: `${base}?view=summary` };
}
export type CampaignMetric = "arrival" | "start" | "save_success" | "save_error" | "withdraw" | "share_click";
// Explicit allowlist: never send block, row, number, owner token, draft or arbitrary query values.
export function campaignMetric(name: CampaignMetric, eventId: string, query: string, view: string) {
  const params = new URLSearchParams(query);
  const source = params.get("utm_source");
  return { name: `seat_campaign_${name}`, params: { event_id: eventId, entry_source: ["x","partner","site"].includes(source ?? "") ? source! : params.get("from") === "seat-search" ? "seat_search" : "direct", post_id: queryAcquisition(query).postId, campaign_view: view === "summary" ? "summary" : "report" } };
}
// Conservative X weighted length: count all non-ASCII as two; URLs consume 23.
export function xTextWeight(text: string) {
  return text.split(/(https:\/\/[^\s]+)/g).reduce((total, part) => total + (part.startsWith("https://") ? 23 : [...part].reduce((n,c)=>n+(c.codePointAt(0)! < 128 ? 1 : 2),0)), 0);
}
export function xCampaignDrafts(summary: CampaignSummary, localOnly: boolean, update?: { added: number; removed: number; id: string; hasBaseline?: boolean }) {
  const links = campaignLinks(summary.event.id, false);
  const revisionId = update?.id.slice(0,12) ?? summary.updatedAt.replace(/[^0-9]/g, "").slice(-12).padStart(12,"0");
  const link = (url: string, kind: string) => { const u = new URL(url); u.searchParams.set("utm_content", `${kind}-${revisionId}`); return u.toString(); };
  const form = localOnly ? "［公開後の入力URL］" : campaignRecruitmentLink(`https://tixrepo.com${links.form}`, "x", summary.event.id, "recruit");
  const result = localOnly ? "［公開後の集計URL］" : campaignRecruitmentLink(`https://tixrepo.com${links.summary}`, "x", summary.event.id, "update");
  const title = [...summary.event.title].slice(0, 30).join("") + ([...summary.event.title].length > 30 ? "…" : "");
  const head = `${localOnly ? "【未公開サンプル】\n" : ""}${title}\n${summary.event.date} ${summary.event.session}\n`;
  const count = `本人入力${summary.selfSubmissions}件・座席情報${summary.selfLocations}組（未照合含む）。`;
  const note = "報告なし＝席なしではありません。";
  const stamp = new Date(summary.updatedAt).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
  const missing = summary.missingBlocks.slice(0,2).map(b=>b.block.slice(0,12)).join("・");
  const delta = update ? update.hasBaseline===false ? `初回集計：座席情報${summary.selfLocations}組（未照合含む）。` : `前回投稿から追加${update.added}組・除外${update.removed}組。` : "報告一覧を更新。";
  const withLink = (url: string, kind: string) => localOnly ? url : link(url,kind);
  return [
    { kind: "募集開始", text: `${head}座席情報を募集中。ブロック・列・番号だけで参加できます。途中集計を公開します。\n${withLink(form,"recruit")}` },
    { kind: "途中速報", text: `${head}${stamp}時点 ${count}\n${note}\n${withLink(result,"progress")}` },
    { kind: "追加募集", text: `${head}${missing ? `報告待ち：${missing}。` : "券面の座席情報を募集中。"}\n${note}\n${withLink(form,"additional")}` },
    { kind: "更新報告", text: `${head}${stamp}時点 ${delta}\n配置の変更とは別の集計更新です。\n${withLink(result,"update")}` },
  ].map(d => ({...d, weight: xTextWeight(d.text)}));
}
export function xShareIntent(summary: CampaignSummary) {
  const url = campaignRecruitmentLink(`https://tixrepo.com${campaignLinks(summary.event.id, false).summary}`, "x", summary.event.id, "share");
  const text = `${[...summary.event.title].slice(0,30).join("")} ${summary.event.date}\nこの公演の座席報告を集めています。現在の報告一覧はこちら。`;
  const intent = new URL("https://twitter.com/intent/tweet"); intent.searchParams.set("text", text); intent.searchParams.set("url", url);
  return intent.toString();
}
