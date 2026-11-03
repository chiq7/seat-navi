const localHosts = new Set(["127.0.0.1:3142", "localhost:3142"]);
export function localCampaignEnabled(mode: string | undefined, host: string | null) {
  return mode === "development" && localHosts.has(host ?? "");
}
export function localCampaignSubmissionAllowed(host: string | null, origin: string | null, contentType: string | null) {
  if (!localHosts.has(host ?? "") || !contentType?.startsWith("application/json") || !origin) return false;
  try {
    const url = new URL(origin);
    // Compare the browser Origin to Host, not NextURL (Next normalizes loopback hosts).
    return url.protocol === "http:" && url.host === host && url.origin === origin;
  } catch { return false; }
}
