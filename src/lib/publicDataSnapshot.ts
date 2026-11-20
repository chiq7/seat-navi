import { getJstDateString } from "./artistPageData";
import { publicPageDataPaths, type HomePrograms, type PublicFeed, type VenuePrograms } from "./publicPageData";

type PublicDataSnapshot = {
  updatedAt: string;
  data: PublicFeed | HomePrograms | { events: NonNullable<VenuePrograms["events"]>; today: string };
};

export function publicDataSnapshotAsset(path: string) {
  return `/_tixrepo/data${path.slice("/api/public".length)}.json`;
}

/** Keep only data that can safely outlive its upstream read. */
export function createPublicDataSnapshot(path: string, value: unknown, updatedAt: string): PublicDataSnapshot {
  if (!Number.isFinite(Date.parse(updatedAt))) throw new Error("Missing public data capture time");
  if (path === publicPageDataPaths.feed) {
    if (!Array.isArray(value)) throw new Error("Invalid public feed");
    const data = (value as PublicFeed)
      .filter(item => item.source === "collection" || (item.source === "editorial" && !item.id.startsWith("supplemental-")))
      .map(item => ({ ...item, xHandle: null }));
    return { updatedAt, data };
  }
  if (!value || typeof value !== "object" || !("events" in value) || !Array.isArray(value.events)) {
    throw new Error("Invalid public programs");
  }
  if (path === publicPageDataPaths.upcoming) {
    const { events } = value as HomePrograms;
    return { updatedAt, data: { events, discoveryCards: [] } };
  }
  const { today } = value as VenuePrograms;
  if (typeof today !== "string") throw new Error("Missing venue programs date");
  return { updatedAt, data: { events: value.events, today } };
}

export function readPublicDataSnapshot(path: string, value: unknown, now = new Date()) {
  if (!value || typeof value !== "object" || !("data" in value) || !("updatedAt" in value) || typeof value.updatedAt !== "string") {
    throw new Error("Invalid public data snapshot");
  }
  const { updatedAt, data } = createPublicDataSnapshot(path, value.data, value.updatedAt);
  const today = getJstDateString(now);
  if (Array.isArray(data)) {
    const expired = now.getTime() - Date.parse(updatedAt) >= 86_400_000;
    return { updatedAt, data: expired ? [] : data.filter(item => !item.date || item.date >= today) };
  }
  if ("discoveryCards" in data) {
    return { updatedAt, data: { ...data, events: data.events.filter(event => event.dateIso && event.dateIso >= today) } };
  }
  return { updatedAt, data: { ...data, today } };
}
