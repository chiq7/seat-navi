import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAllowedOfficialResaleUrl } from "@/lib/external-seats/sourcePolicy";

export const dynamic = "force-dynamic";

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
    sourceUrl?: string;
    sourceType?: "pia_resale" | "official_resale";
    targetDate?: string;
  } | null;
  if (!body?.eventId || !body.sourceUrl || !body.sourceType || !/^\d{4}-\d{2}-\d{2}$/.test(body.targetDate ?? "")) {
    return NextResponse.json({ error: "eventId・sourceUrl・sourceType・targetDate が必要です" }, { status: 400 });
  }
  if (!isAllowedOfficialResaleUrl(body.sourceUrl)) {
    return NextResponse.json({ error: "公式リセールとして許可されたhttps URLではありません" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabaseのサーバー環境変数が未設定です" }, { status: 503 });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: event } = await supabase.from("events").select("id, date").eq("id", body.eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: "対象公演が見つかりません" }, { status: 404 });

  const { error } = await supabase.from("external_seat_sources").upsert(
    {
      event_id: body.eventId,
      source_type: body.sourceType,
      source_url: body.sourceUrl,
      target_date: body.targetDate,
      active: true,
      last_error: null,
    },
    { onConflict: "event_id,source_url" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, eventId: event.id, eventDate: event.date, targetDate: body.targetDate });
}
