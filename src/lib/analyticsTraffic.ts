export const VERIFICATION_STORAGE_KEY = "tixrepo.verification.v1";
export const VERIFICATION_ENTRY_PATH = "/verification-access";
export const VERIFICATION_LIFETIME_MS = 2 * 60 * 60 * 1000;

export type VerificationRole = "codex" | "operator";
export type TrafficOrigin = "public_unmarked" | "verification_codex" | "verification_operator" | "unclassified";

declare global {
  interface Window { __tixrepoTrafficOrigin?: TrafficOrigin; }
}

export interface VerificationMarker {
  v: 1;
  role: VerificationRole;
  startedAt: number;
  expiresAt: number;
}

// Self-contained: also embedded before the initial GA config, without React hydration.
export function classifyVerificationMarker(raw: string | null, now: number): TrafficOrigin {
  if (raw === null) return "public_unmarked";
  try {
    const marker = JSON.parse(raw);
    if (marker.v !== 1 || !["codex", "operator"].includes(marker.role) ||
        !Number.isSafeInteger(marker.startedAt) || !Number.isSafeInteger(marker.expiresAt) ||
        marker.startedAt > now || marker.expiresAt <= marker.startedAt ||
        marker.expiresAt - marker.startedAt > 7200000) return "unclassified";
    if (marker.expiresAt <= now) return "public_unmarked";
    return marker.role === "codex" ? "verification_codex" : "verification_operator";
  } catch { return "unclassified"; }
}

export function createVerificationMarker(role: VerificationRole, now = Date.now()): VerificationMarker {
  if (role !== "codex" && role !== "operator") throw new Error("Invalid verification role");
  return { v: 1, role, startedAt: now, expiresAt: now + VERIFICATION_LIFETIME_MS };
}

export function getTrafficOrigin(): TrafficOrigin {
  if (typeof window === "undefined") return "unclassified";
  return window.__tixrepoTrafficOrigin ?? "unclassified";
}

export function beginVerification(role: VerificationRole): void {
  const value = JSON.stringify(createVerificationMarker(role));
  window.sessionStorage.setItem(VERIFICATION_STORAGE_KEY, value);
  if (window.sessionStorage.getItem(VERIFICATION_STORAGE_KEY) !== value) throw new Error("Verification storage unavailable");
  // A document navigation configures GA before its first page_view.
  window.location.assign("/");
}

export function endVerification(): void {
  try { window.sessionStorage.removeItem(VERIFICATION_STORAGE_KEY); } catch { /* Entry page does not send GA events. */ }
  window.location.replace(VERIFICATION_ENTRY_PATH);
}

export function gaBootstrapScript(measurementId: string): string {
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) throw new Error("Invalid GA measurement ID");
  return `(function(w){if(location.pathname===${JSON.stringify(VERIFICATION_ENTRY_PATH)})return;var origin;try{origin=(${classifyVerificationMarker.toString()})(sessionStorage.getItem(${JSON.stringify(VERIFICATION_STORAGE_KEY)}),Date.now());}catch(e){origin='unclassified';}w.__tixrepoTrafficOrigin=origin;w.dataLayer=w.dataLayer||[];w.gtag=w.gtag||function(){w.dataLayer.push(arguments);};w.gtag('js',new Date());var config={traffic_origin:origin,page_location:location.origin+location.pathname,page_referrer:document.referrer?document.referrer.split(/[?#]/)[0]:''};if(origin==='verification_codex'||origin==='verification_operator')config.cookie_prefix='tixrepo_'+origin;w.gtag('config',${JSON.stringify(measurementId)},config);w.dispatchEvent(new Event('tixrepo-traffic-ready'));})(window);`;
}
