import { AsyncLocalStorage } from "node:async_hooks";
import type { PublicEventCatalog } from "./publicEventCatalog";

type CatalogReader = () => Promise<PublicEventCatalog | null>;
const context = new AsyncLocalStorage<CatalogReader>();

export function withPublicEventCatalog<T>(read: CatalogReader, render: () => T): T {
  return context.run(read, render);
}

export async function getRequestPublicEventCatalog() {
  return await context.getStore()?.() ?? null;
}
