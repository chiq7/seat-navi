import type { EventExtractionModel, ExtractedEvent } from "./eventCrawler";

const GENRES = ["kpop", "johnnys", "female_idol", "male_idol", "other"];
const EVENT_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, date: { type: ["string", "null"] }, genre: { enum: GENRES } },
        required: ["title", "date", "genre"],
        additionalProperties: false,
      },
    },
  },
  required: ["events"],
  additionalProperties: false,
};

type WorkersAiEventInput = {
  messages: Array<{ role: "user"; content: string }>;
  response_format: { type: "json_schema"; json_schema: typeof EVENT_SCHEMA };
  max_tokens: number;
};

function isExtractedEvent(value: unknown): value is ExtractedEvent {
  if (!value || typeof value !== "object") return false;
  const { title, date, genre } = value as Partial<ExtractedEvent>;
  return typeof title === "string" && title.trim().length > 0
    && (date === null || typeof date === "string") && typeof genre === "string" && GENRES.includes(genre);
}

export function workersAiEventModel(model: string, run: (model: string, input: WorkersAiEventInput) => Promise<{ response?: unknown }>): EventExtractionModel {
  if (!/^@cf\/[a-z0-9_-]+\/[a-z0-9_.-]+$/i.test(model)) throw new Error("Invalid Workers AI model name");
  return {
    name: "Workers AI",
    async complete(prompt) {
      const { response } = await run(model, {
        messages: [{ role: "user", content: `${prompt}\n最上位はJSONオブジェクトです。イベント配列は events に入れてください。` }],
        response_format: { type: "json_schema", json_schema: EVENT_SCHEMA },
        max_tokens: 4096,
      });
      const result: unknown = typeof response === "string" ? JSON.parse(response) : response;
      if (!result || typeof result !== "object" || !("events" in result) || !Array.isArray(result.events)
        || !result.events.every(isExtractedEvent)) {
        throw new Error("Workers AI response does not match the event schema");
      }
      return JSON.stringify(result.events);
    },
  };
}
