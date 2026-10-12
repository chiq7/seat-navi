import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { referenceImages } from "@/lib/arena-map/referenceEvidenceV5";

const researchDirectory = "C:/Users/tcgea/Documents/Codex/2026-09-20/https-tixrepo-com-report-live-event/outputs/arena-research-2026-09-29";
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!Object.hasOwn(referenceImages, id)) return new Response(null, { status: 404 });
  const file = referenceImages[id as keyof typeof referenceImages];
  try {
    const bytes = await readFile(join(researchDirectory, file));
    const type = file.endsWith(".webp") ? "image/webp" : file.endsWith(".jpg") ? "image/jpeg" : "image/png";
    return new Response(bytes, { headers: { "Content-Type": type, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
  } catch { return new Response(null, { status: 404 }); }
}
