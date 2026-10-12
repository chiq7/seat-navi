import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ingestExternalSeatText } from "@/lib/external-seats/ingest";
import type { ExternalSeatSourceType } from "@/lib/external-seats/types";

export const dynamic = "force-dynamic";

const SOURCE_TYPES = new Set<ExternalSeatSourceType>([
  "pia_resale",
  "ticketjam",
  "ticket_ryutsu",
  "official_resale",
  "other",
]);

export async function POST(request: NextRequest) {
  const importToken = process.env.EXTERNAL_SEAT_IMPORT_TOKEN;
  if (!importToken) {
    return NextResponse.json({ error: "EXTERNAL_SEAT_IMPORT_TOKEN が未設定です" }, { status: 503 });
  }
  if (request.headers.get("x-tixrepo-import-token") !== importToken) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    eventId?: string;
    sourceType?: ExternalSeatSourceType;
    sourceUrl?: string;
    text?: string;
    dryRun?: boolean;
  } | null;
  if (!body?.eventId || !body.text || !body.sourceType || !SOURCE_TYPES.has(body.sourceType)) {
    return NextResponse.json({ error: "eventId・sourceType・text が必要です" }, { status: 400 });
  }
  if (body.text.length > 200_000) {
    return NextResponse.json({ error: "取込テキストが大きすぎます" }, { status: 413 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabaseのサーバー環境変数が未設定です" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: event } = await supabase.from("events").select("id").eq("id", body.eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: "対象公演が見つかりません" }, { status: 404 });

  try {
    const result = await ingestExternalSeatText({
      supabase,
      eventId: body.eventId,
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl,
      text: body.text,
      ingestionMethod: "manual",
      dryRun: body.dryRun,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "取込に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

