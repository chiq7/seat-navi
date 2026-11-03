// Acquisition metadata is absent, not "general sale" or "not upgraded".
export const SEAT_ONLY_PRESENTATION = { color: "#0f766e", background: "#e9f7f4", label: "座席情報のみ", description: "当選枠・FC歴・支払い・アプグレの情報は含みません" } as const;
export const CAMPAIGN_REFRESH_MS = 30_000;
export function canRefreshCampaign(view: string, visible: boolean, online: boolean, submitting: boolean, inFlight: boolean) {
  return view === "summary" && visible && online && !submitting && !inFlight;
}
export function campaignRecruitmentLink(baseUrl: string, channel: "x" | "partner" | "site", campaignId: string, kind: "recruit" | "update" | "share") {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.hostname !== "tixrepo.com" || url.username || url.password || url.port || url.pathname.startsWith("/dev/")) throw new Error("公開済みのちけレポURLが必要です。");
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(campaignId)) throw new Error("公演の計測IDを確認してください。");
  url.searchParams.set("utm_source", channel === "x" ? "x" : channel);
  url.searchParams.set("utm_medium", channel === "site" ? "internal" : "social");
  url.searchParams.set("utm_campaign", campaignId);
  url.searchParams.set("utm_content", kind);
  return url.toString();
}
