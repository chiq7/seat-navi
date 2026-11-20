import { AsyncLocalStorage } from "node:async_hooks";
import type { PublicEventCatalog } from "./publicEventCatalog";

type CatalogReader = () => Promise<PublicEventCatalog | null>;
type Fallback = (id: string) => Promise<boolean | null>;
const context = new AsyncLocalStorage<{ catalog: CatalogReader; fallback?: Fallback }>();

export function withPublicEventCatalog<T>(read: CatalogReader, render: () => T, fallback?: Fallback): T {
  return context.run({ catalog: read, fallback }, render);
}

export async function getRequestPublicEventCatalog() {
  return await context.getStore()?.catalog() ?? null;
}

export async function getFallbackEventIndex(id: string) {
  return await context.getStore()?.fallback?.(id) ?? null;
}
