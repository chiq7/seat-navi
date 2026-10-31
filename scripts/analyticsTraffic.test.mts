import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { classifyVerificationMarker, createVerificationMarker, gaBootstrapScript } from "../src/lib/analyticsTraffic.ts";

const now = 1803380400000;
const marker = (role: "codex" | "operator") => JSON.stringify(createVerificationMarker(role, now));

function bootstrap(raw: string | null, options: { path?: string; blocked?: boolean; search?: string; ua?: string } = {}) {
  const window = { dataLayer: [] as unknown[], dispatchEvent() {} };
  const context = { window, location: { origin: "https://tixrepo.com", pathname: options.path ?? "/venues/belluna-dome", search: options.search ?? "" }, document: { referrer: "https://chatgpt.com/?private=value" }, navigator: { userAgent: options.ua ?? "Chrome" }, sessionStorage: { getItem() { if (options.blocked) throw new Error("blocked"); return raw; } }, Date: class extends Date { static now() { return now; } }, Event: class {} };
  vm.runInNewContext(gaBootstrapScript("G-TEST123"), context);
  const config = window.dataLayer.map(value => Array.from(value as ArrayLike<unknown>)).find(value => value[0] === "config")?.[2] as Record<string, unknown> | undefined;
  return { config, window };
}

test("normal ChatGPT, mobile and verification-looking URL visits are never marked internal", () => {
  for (const ua of ["Chrome", "HeadlessChrome", "iPhone", "Android"]) {
    const { config } = bootstrap(null, { search: "?traffic_origin=verification_codex&utm_source=chatgpt.com", ua });
    assert.equal(config?.traffic_origin, "public_unmarked");
    assert.equal(config?.cookie_prefix, undefined);
  }
});

test("explicit Codex/operator markers classify the initial page_view and isolate QA cookies", () => {
  for (const role of ["codex", "operator"] as const) {
    assert.equal(classifyVerificationMarker(marker(role), now), `verification_${role}`);
    const { config } = bootstrap(marker(role));
    assert.equal(config?.traffic_origin, `verification_${role}`);
    assert.equal(config?.cookie_prefix, `tixrepo_verification_${role}`);
  }
});

test("invalid, long-lived and blocked storage never causes an internal exclusion", () => {
  const invalid = ["broken", "null", JSON.stringify({ ...createVerificationMarker("codex", now), role: "someone" }), JSON.stringify({ ...createVerificationMarker("codex", now), expiresAt: now + 7200001 }), JSON.stringify({ ...createVerificationMarker("codex", now + 1) })];
  for (const raw of invalid) assert.equal(bootstrap(raw).config?.traffic_origin, "unclassified");
  assert.equal(bootstrap(marker("codex"), { blocked: true }).config?.traffic_origin, "unclassified");
});

test("expired markers no longer mark a visit internal", () => {
  const expired = JSON.stringify(createVerificationMarker("codex", now - 7200000));
  assert.equal(bootstrap(expired).config?.traffic_origin, "public_unmarked");
});

test("control page emits no GA config, and marker is not leaked into shared URLs", () => {
  assert.equal(bootstrap(marker("operator"), { path: "/verification-access" }).config, undefined);
  const { config } = bootstrap(marker("operator"));
  assert.equal(config?.page_location, "https://tixrepo.com/venues/belluna-dome");
  assert.equal(config?.page_referrer, "https://chatgpt.com/");
  assert.throws(() => gaBootstrapScript("G-TEST';alert(1)"));
});
