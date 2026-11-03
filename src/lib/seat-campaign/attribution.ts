export type Acquisition = { source: "x" | "partner" | "site" | "direct"; postId: string };
export function acquisition(value: unknown): Acquisition {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { source: ["x", "partner", "site"].includes(String(v.source)) ? v.source as Acquisition["source"] : "direct", postId: typeof v.postId === "string" && /^(recruit|progress|additional|update|share)-[a-f0-9]{12}$/.test(v.postId) ? v.postId : "unattributed" };
}
export function queryAcquisition(query: string): Acquisition {
  const p = new URLSearchParams(query);
  return acquisition({ source: p.get("utm_source") ?? (p.get("from") === "seat-search" ? "site" : "direct"), postId: p.get("utm_content") });
}
