import { readFile } from "node:fs/promises";
import { extractEventsWithModel, type ExtractedEvent } from "../src/lib/eventCrawler.ts";
import { workersAiEventModel } from "../src/lib/workersAiEvents.ts";

// Run a single public source fixture against Workers AI after supplying the account and model.
// The fixture contains { venue: { id, name }, text, expected: [{ title, date, genre }] }.
const [fixturePath] = process.argv.slice(2);
const { TIXREPO_WORKERS_AI_ACCOUNT_ID: account, TIXREPO_WORKERS_AI_TOKEN: token, TIXREPO_WORKERS_AI_MODEL: model } = process.env;
if (!fixturePath || !account || !/^[a-f0-9]{32}$/i.test(account) || !token || !model) {
  throw new Error("Specify a fixture and TIXREPO_WORKERS_AI_ACCOUNT_ID, TIXREPO_WORKERS_AI_TOKEN, TIXREPO_WORKERS_AI_MODEL");
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as { venue: { id: string; name: string }; text: string; expected: ExtractedEvent[] };
if (!fixture.venue?.id || !fixture.venue?.name || typeof fixture.text !== "string" || !Array.isArray(fixture.expected)) {
  throw new Error("Fixture must contain venue, public source text and expected events");
}

const extractor = workersAiEventModel(model, async (name, input) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${name}`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Workers AI returned HTTP ${response.status}`);
  const output = await response.json() as { success: boolean; result?: { response?: unknown } };
  if (!output.success || !output.result) throw new Error("Workers AI request did not return an inference result");
  return output.result;
});

const result = await extractEventsWithModel(fixture.text, fixture.venue, extractor);
const key = (event: ExtractedEvent) => JSON.stringify([event.title.normalize("NFKC").trim(), event.date, event.genre]);
const expected = new Set(fixture.expected.map(key));
const returned = new Set(result.events.map(key));
const missing = fixture.expected.filter(event => !returned.has(key(event)));
const unexpected = result.events.filter(event => !expected.has(key(event)));
const duplicates = result.events.length - returned.size;
console.log(JSON.stringify({ model, venue: fixture.venue.id, elapsedMs: result.elapsedMs, error: result.error, missing, unexpected, duplicates }, null, 2));
if (result.error || missing.length || unexpected.length || duplicates) process.exitCode = 1;
