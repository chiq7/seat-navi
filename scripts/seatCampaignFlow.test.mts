import test from "node:test";
import assert from "node:assert/strict";
import { makeSearchDraft, readSearchDraft, searchDraftPrefill, SEARCH_DRAFT_TTL_MS } from "../src/lib/seat-campaign/searchHandoff.ts";
import { canRefreshCampaign, campaignRecruitmentLink, SEAT_ONLY_PRESENTATION } from "../src/lib/seat-campaign/presentation.ts";
import { PILOT_EVENT } from "../src/lib/seat-campaign/pilot.ts";

const now = 1_800_000_000_000;
const draft = makeSearchDraft(PILOT_EVENT, "kyocera-dome", "０８", "０４１", "1塁側・下段", "test-draft", now);
test("search handoff keeps ticket inputs but never adopts diagram label or acquisition information", () => {
  const result = searchDraftPrefill(draft);
  assert.deepEqual(result, { seatType: "stand", block: "", row: "8", number: "41" });
  assert.equal("lottery_type" in result, false);
  assert.equal("upgrade" in result, false);
});
test("same event, date, session and venue are required for a search draft", () => {
  assert.deepEqual(readSearchDraft(JSON.stringify(draft), PILOT_EVENT, "kyocera-dome", now), draft);
  for (const field of ["eventId", "date", "session", "venueId", "seatType", "version"]) {
    assert.equal(readSearchDraft(JSON.stringify({ ...draft, [field]: "wrong" }), PILOT_EVENT, "kyocera-dome", now), null);
  }
});
test("expired, future, damaged and missing drafts do not prefill unrelated seats", () => {
  assert.equal(readSearchDraft(JSON.stringify(draft), PILOT_EVENT, "kyocera-dome", now + SEARCH_DRAFT_TTL_MS + 1), null);
  assert.equal(readSearchDraft(JSON.stringify(draft), PILOT_EVENT, "kyocera-dome", now - 1), null);
  for (const raw of [null, "bad-json", "{}", "null"]) assert.equal(readSearchDraft(raw, PILOT_EVENT, "kyocera-dome", now), null);
});
test("unprinted row zero is not silently turned into row one", () => {
  assert.throws(() => makeSearchDraft(PILOT_EVENT, "kyocera-dome", "0", "1", "FB", "sample", now));
  assert.throws(() => makeSearchDraft(PILOT_EVENT, "kyocera-dome", "1-20", "1", "範囲", "sample", now));
});
test("background, offline, input, submitting and in-flight states suppress polling", () => {
  assert.equal(canRefreshCampaign("summary", true, true, false, false), true);
  for (const [view, visible, online, submitting, inFlight] of [
    ["report", true, true, false, false], ["summary", false, true, false, false],
    ["summary", true, false, false, false], ["summary", true, true, true, false], ["summary", true, true, false, true],
  ] as const) assert.equal(canRefreshCampaign(view, visible, online, submitting, inFlight), false);
});
test("seat-only has its own explicit presentation, without implying ticket conditions", () => {
  assert.equal(SEAT_ONLY_PRESENTATION.label, "座席情報のみ");
  assert.equal(SEAT_ONLY_PRESENTATION.color, "#0f766e");
  assert.match(SEAT_ONLY_PRESENTATION.description, /含みません/);
});
test("recruitment URL preserves event identity and separates recruitment/update sources", () => {
  const link = new URL(campaignRecruitmentLink("https://tixrepo.com/report/live?event=verified-event", "x", "pilot-event", "recruit"));
  assert.equal(link.searchParams.get("event"), "verified-event");
  assert.equal(link.searchParams.get("utm_source"), "x");
  assert.equal(link.searchParams.get("utm_content"), "recruit");
  assert.equal(link.searchParams.has("number"), false);
  assert.equal(link.searchParams.has("row"), false);
});
test("local, noncanonical, credentialed and dev URLs cannot become recruitment links", () => {
  for (const base of ["http://127.0.0.1:3142/dev/seat-campaign", "https://tixrepo.com/dev/seat-campaign", "https://tixrepo.com.attacker.test/report", "https://user@tixrepo.com/report", "http://tixrepo.com/report", "https://tixrepo.com:8443/report"]) {
    assert.throws(() => campaignRecruitmentLink(base, "x", "pilot-event", "recruit"));
  }
});
