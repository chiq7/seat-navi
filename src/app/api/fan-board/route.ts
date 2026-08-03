import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { findArtistBySlug } from "@/lib/artists";
import {
  createFanBoardAdminClient,
  FAN_BOARD_BODY_MAX,
  FAN_BOARD_BUCKET,
  FAN_BOARD_NAME_MAX,
  FAN_BOARD_PHOTO_BYTES_MAX,
  FAN_BOARD_PHOTO_MAX,
  getRequestHash,
  hasValidImageSignature,
  imageExtension,
  isSameOrigin,
} from "@/lib/fanBoard/server";
import type { FanBoardListResponse, FanBoardPost, FanBoardReply } from "@/lib/fanBoard/types";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  parent_id: string | null;
  display_name: string;
  body: string;
  photo_paths: string[];
  created_at: string;
};

const REPORT_REASONS = new Set(["spam", "harassment", "spoiler", "unsafe", "other"]);

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function buildPhotoUrlMap(
  supabase: NonNullable<ReturnType<typeof createFanBoardAdminClient>>,
  rows: PostRow[],
) {
  const paths = [...new Set(rows.flatMap((row) => row.photo_paths))];
  if (paths.length === 0) return new Map<string, string>();
  const { data, error } = await supabase.storage.from(FAN_BOARD_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) return new Map<string, string>();
  const entries = (data ?? []).flatMap((item): Array<[string, string]> =>
    item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [],
  );
  return new Map<string, string>(entries);
}

function safeReply(row: PostRow, urls: Map<string, string>): FanBoardReply {
  return {
    id: row.id,
    displayName: row.display_name,
    body: row.body,
    photos: row.photo_paths.flatMap((path) => {
      const url = urls.get(path);
      return url ? [{ path, url }] : [];
    }),
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const artistSlug = request.nextUrl.searchParams.get("artistSlug")?.trim() ?? "";
  if (!findArtistBySlug(artistSlug)) return errorResponse("対象アーティストが見つかりません", 404);
  const supabase = createFanBoardAdminClient();
  if (!supabase) return errorResponse("掲示板の接続設定が未完了です", 503);

  const { data: rootData, error: rootError } = await supabase
    .from("fan_board_posts")
    .select("id, parent_id, display_name, body, photo_paths, created_at")
    .eq("artist_slug", artistSlug)
    .eq("status", "visible")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (rootError) return errorResponse("掲示板を読み込めませんでした", 503);

  const roots = (rootData ?? []) as PostRow[];
  const rootIds = roots.map((row) => row.id);
  let replies: PostRow[] = [];
  if (rootIds.length > 0) {
    const { data: replyData, error: replyError } = await supabase
      .from("fan_board_posts")
      .select("id, parent_id, display_name, body, photo_paths, created_at")
      .eq("artist_slug", artistSlug)
      .eq("status", "visible")
      .in("parent_id", rootIds)
      .order("created_at", { ascending: true })
      .limit(150);
    if (!replyError) replies = (replyData ?? []) as PostRow[];
  }

  const urls = await buildPhotoUrlMap(supabase, [...roots, ...replies]);
  const repliesByParent = new Map<string, FanBoardReply[]>();
  for (const reply of replies) {
    if (!reply.parent_id) continue;
    const list = repliesByParent.get(reply.parent_id) ?? [];
    list.push(safeReply(reply, urls));
    repliesByParent.set(reply.parent_id, list);
  }

  const posts: FanBoardPost[] = roots.map((row) => ({
    ...safeReply(row, urls),
    replies: repliesByParent.get(row.id) ?? [],
  }));
  return NextResponse.json({ posts } satisfies FanBoardListResponse, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return errorResponse("不正な送信元です", 403);
  const supabase = createFanBoardAdminClient();
  const actorHash = getRequestHash(request);
  if (!supabase || !actorHash) return errorResponse("掲示板の接続設定が未完了です", 503);

  const form = await request.formData().catch(() => null);
  if (!form) return errorResponse("投稿内容を読み取れませんでした", 400);
  const action = String(form.get("action") ?? "post");
  const artistSlug = String(form.get("artistSlug") ?? "").trim();
  if (!findArtistBySlug(artistSlug)) return errorResponse("対象アーティストが見つかりません", 404);

  if (action === "report") {
    const postId = String(form.get("postId") ?? "");
    const reason = String(form.get("reason") ?? "other");
    if (!postId || !REPORT_REASONS.has(reason)) return errorResponse("通報内容が正しくありません", 400);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("fan_board_reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_hash", actorHash)
      .gte("created_at", oneDayAgo);
    if ((count ?? 0) >= 10) return errorResponse("本日の通報上限に達しました", 429);

    const { data: target } = await supabase
      .from("fan_board_posts")
      .select("id")
      .eq("id", postId)
      .eq("artist_slug", artistSlug)
      .eq("status", "visible")
      .maybeSingle();
    if (!target) return errorResponse("対象投稿が見つかりません", 404);

    const { error } = await supabase.from("fan_board_reports").insert({
      post_id: postId,
      reporter_hash: actorHash,
      reason,
    });
    if (error && error.code !== "23505") return errorResponse("通報を送信できませんでした", 500);
    return NextResponse.json({ ok: true });
  }

  const displayName = String(form.get("displayName") ?? "").trim() || "匿名ファン";
  const body = String(form.get("body") ?? "").trim();
  const parentId = String(form.get("parentId") ?? "").trim() || null;
  if (displayName.length > FAN_BOARD_NAME_MAX) return errorResponse("名前は24文字以内で入力してください", 400);
  if (!body || body.length > FAN_BOARD_BODY_MAX) return errorResponse("本文は1〜500文字で入力してください", 400);

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [recentResult, dailyResult] = await Promise.all([
    supabase.from("fan_board_posts").select("id", { count: "exact", head: true }).eq("rate_limit_hash", actorHash).gte("created_at", tenMinutesAgo),
    supabase.from("fan_board_posts").select("id", { count: "exact", head: true }).eq("rate_limit_hash", actorHash).gte("created_at", oneDayAgo),
  ]);
  if ((recentResult.count ?? 0) >= 3) return errorResponse("短時間の連続投稿を制限しています。少し待ってください", 429);
  if ((dailyResult.count ?? 0) >= 12) return errorResponse("本日の投稿上限に達しました", 429);

  if (parentId) {
    const { data: parent } = await supabase
      .from("fan_board_posts")
      .select("id, parent_id")
      .eq("id", parentId)
      .eq("artist_slug", artistSlug)
      .eq("status", "visible")
      .maybeSingle();
    if (!parent || parent.parent_id) return errorResponse("返信先が見つかりません", 404);
  }

  const files = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > FAN_BOARD_PHOTO_MAX) return errorResponse("写真は2枚までです", 400);
  for (const file of files) {
    if (file.size > FAN_BOARD_PHOTO_BYTES_MAX) return errorResponse("写真は1枚4MBまでです", 413);
    if (!imageExtension(file) || !(await hasValidImageSignature(file))) {
      return errorResponse("JPEG・PNG・WebPの写真を選んでください", 400);
    }
  }

  const postId = randomUUID();
  const uploadedPaths: string[] = [];
  for (const [index, file] of files.entries()) {
    const extension = imageExtension(file);
    if (!extension) continue;
    const path = `${artistSlug}/${postId}/${index}-${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(FAN_BOARD_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      if (uploadedPaths.length > 0) await supabase.storage.from(FAN_BOARD_BUCKET).remove(uploadedPaths);
      return errorResponse("写真を保存できませんでした", 500);
    }
    uploadedPaths.push(path);
  }

  const { error } = await supabase.from("fan_board_posts").insert({
    id: postId,
    artist_slug: artistSlug,
    parent_id: parentId,
    display_name: displayName,
    body,
    photo_paths: uploadedPaths,
    rate_limit_hash: actorHash,
  });
  if (error) {
    if (uploadedPaths.length > 0) await supabase.storage.from(FAN_BOARD_BUCKET).remove(uploadedPaths);
    return errorResponse("投稿を保存できませんでした", 500);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
