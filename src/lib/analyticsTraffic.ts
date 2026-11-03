export const VERIFICATION_STORAGE_KEY = "tixrepo.verification.v1";
export const ANALYTICS_EXCLUSION_KEY = "tixrepo.analytics-exclusion.v1";
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

// Explicit browser opt-out persists until the operator deliberately restores collection.
export function classifyAnalyticsExclusion(raw: string | null, now: number): TrafficOrigin | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    if (value.v === 1 && ["codex", "operator"].includes(value.role) && Number.isSafeInteger(value.startedAt) && value.startedAt <= now) {
      return value.role === "codex" ? "verification_codex" : "verification_operator";
    }
  } catch { /* An explicit but damaged opt-out remains excluded. */ }
  return "unclassified";
}

export function beginVerification(role: VerificationRole): void {
  if (role !== "codex" && role !== "operator") throw new Error("Invalid verification role");
  const value = JSON.stringify({ v: 1, role, startedAt: Date.now() });
  window.localStorage.setItem(ANALYTICS_EXCLUSION_KEY, value);
  if (window.localStorage.getItem(ANALYTICS_EXCLUSION_KEY) !== value) throw new Error("Verification storage unavailable");
  window.location.assign("/");
}

export function endVerification(): void {
  window.localStorage.removeItem(ANALYTICS_EXCLUSION_KEY);
  window.sessionStorage.removeItem(VERIFICATION_STORAGE_KEY);
  window.location.replace(window.location.pathname === VERIFICATION_ENTRY_PATH ? "/" : VERIFICATION_ENTRY_PATH);
}

export function gaBootstrapScript(measurementId: string): string {
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) throw new Error("Invalid GA measurement ID");
  return `(function(w){var disabled=location.pathname===${JSON.stringify(VERIFICATION_ENTRY_PATH)},origin='public_unmarked',persistent=null,legacy=null;try{persistent=localStorage.getItem(${JSON.stringify(ANALYTICS_EXCLUSION_KEY)});}catch(e){}try{legacy=sessionStorage.getItem(${JSON.stringify(VERIFICATION_STORAGE_KEY)});}catch(e){origin='unclassified';}var excluded=(${classifyAnalyticsExclusion.toString()})(persistent,Date.now());if(excluded!==null){disabled=true;origin=excluded;}else{origin=(${classifyVerificationMarker.toString()})(legacy,Date.now());if(origin==='verification_codex'||origin==='verification_operator')disabled=true;else if(legacy!==null){try{var old=JSON.parse(legacy);if(old.v===1&&['codex','operator'].includes(old.role)&&Number.isSafeInteger(old.startedAt)&&Number.isSafeInteger(old.expiresAt)&&old.startedAt<=Date.now()&&old.expiresAt>old.startedAt&&old.expiresAt-old.startedAt<=7200000){origin='verification_'+old.role;disabled=true;}}catch(e){}}}w.__tixrepoTrafficOrigin=origin;w['ga-disable-'+${JSON.stringify(measurementId)}]=disabled;w.addEventListener('storage',function(e){if(e.key===${JSON.stringify(ANALYTICS_EXCLUSION_KEY)}){w['ga-disable-'+${JSON.stringify(measurementId)}]=true;location.reload();}});if(disabled){w.dispatchEvent(new Event('tixrepo-traffic-ready'));return;}w.dataLayer=w.dataLayer||[];w.gtag=w.gtag||function(){w.dataLayer.push(arguments);};w.gtag('js',new Date());w.gtag('config',${JSON.stringify(measurementId)},{traffic_origin:origin,page_location:location.origin+location.pathname,page_referrer:document.referrer?document.referrer.split(/[?#]/)[0]:''});w.dispatchEvent(new Event('tixrepo-traffic-ready'));})(window);`;
}
