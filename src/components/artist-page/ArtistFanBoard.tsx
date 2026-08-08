"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AtSign, Camera, Flag, ImagePlus, MessageCircle, Send, X } from "lucide-react";
import type { FanBoardListResponse, FanBoardMutationResponse, FanBoardPost, FanBoardReply } from "@/lib/fanBoard/types";

type BoardProps = {
  artistSlug: string;
  artistName: string;
};

type ComposerProps = BoardProps & {
  parentId?: string;
  compact?: boolean;
  onCancel?: () => void;
  onPosted: () => Promise<void>;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function PostPhotos({ post }: { post: FanBoardReply }) {
  if (post.photos.length === 0) return null;
  return (
    <div className={`mt-4 grid gap-2 ${post.photos.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {post.photos.map((photo, index) => (
        <a
          key={photo.path}
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          className="zr-focus relative block aspect-[4/3] overflow-hidden bg-[#e9e3e7]"
          aria-label={`${post.displayName}さんの投稿写真${index + 1}を拡大`}
        >
          <Image src={photo.url} alt="" fill sizes="(max-width: 640px) 85vw, 420px" className="object-cover" />
        </a>
      ))}
    </div>
  );
}

function XHandleLink({ xHandle }: { xHandle?: string }) {
  if (!xHandle) return null;
  return (
    <a
      href={`https://x.com/${xHandle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="zr-focus mt-1 inline-flex min-h-8 items-center gap-1 text-[10px] font-black text-[#817981] hover:text-[#f43679]"
      aria-label={`@${xHandle} をXで開く`}
    >
      <AtSign size={12} />{xHandle}
    </a>
  );
}

function BoardComposer({ artistSlug, artistName, parentId, compact = false, onCancel, onPosted }: ComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 2) {
      setMessage("写真は2枚までです");
      setFiles(selected.slice(0, 2));
      return;
    }
    const invalid = selected.find((file) => file.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (invalid) {
      setMessage("JPEG・PNG・WebP、1枚4MBまで選べます");
      return;
    }
    setMessage("");
    setFiles(selected);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setMessage("");
    const form = new FormData();
    form.set("action", "post");
    form.set("artistSlug", artistSlug);
    form.set("displayName", displayName);
    form.set("xHandle", xHandle);
    form.set("body", body);
    if (parentId) form.set("parentId", parentId);
    files.forEach((file) => form.append("photos", file));

    try {
      const response = await fetch("/api/fan-board", { method: "POST", body: form });
      const result = (await response.json()) as FanBoardMutationResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "投稿できませんでした");
      setBody("");
      setXHandle("");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      setMessage(parentId ? "返信しました" : "掲示板に投稿しました");
      await onPosted();
      if (parentId) onCancel?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "投稿できませんでした");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className={compact ? "border-l-2 border-[#f43679] pl-4 pt-3" : "bg-white p-4 sm:p-5"}>
      {!compact && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.18em] text-[#f43679]">WRITE A MESSAGE</p>
            <h3 className="mt-1 text-[20px] font-black tracking-[-0.03em] text-[#1c171b]">{artistName}について話す</h3>
          </div>
          <MessageCircle size={25} strokeWidth={1.7} className="text-[#f43679]" aria-hidden="true" />
        </div>
      )}

      <label className="block text-[10px] font-black tracking-[0.12em] text-[#817981]">
        表示名（任意）
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value.slice(0, 24))}
          maxLength={24}
          placeholder="匿名ファン"
          className="zr-focus mt-1.5 min-h-11 w-full border border-[#ded8dc] bg-white px-3 text-[13px] font-bold text-[#1c171b] placeholder:text-[#aaa2a8]"
        />
      </label>
      <label className="mt-3 block text-[10px] font-black tracking-[0.12em] text-[#817981]">
        Xアカウント（任意）
        <input
          value={xHandle}
          onChange={(event) => setXHandle(event.target.value.slice(0, 16))}
          maxLength={16}
          placeholder="@fanname"
          className="zr-focus mt-1.5 min-h-11 w-full border border-[#ded8dc] bg-white px-3 text-[13px] font-bold text-[#1c171b] placeholder:text-[#aaa2a8]"
        />
      </label>
      <label className="mt-3 block text-[10px] font-black tracking-[0.12em] text-[#817981]">
        {compact ? "返信" : "メッセージ"}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, 500))}
          maxLength={500}
          required
          rows={compact ? 3 : 4}
          placeholder={compact ? "この投稿に返信する" : "今日のライブ、座席からの景色、好きな曲など"}
          className="zr-focus mt-1.5 w-full resize-y border border-[#ded8dc] bg-white px-3 py-2.5 text-[14px] font-medium leading-6 text-[#1c171b] placeholder:text-[#aaa2a8]"
        />
      </label>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {previews.map((preview, index) => (
            <div key={preview} className="relative aspect-[4/3] overflow-hidden bg-[#eee8ec]">
              <Image src={preview} alt={`選択した写真${index + 1}`} fill unoptimized sizes="160px" className="object-cover" />
              <button
                type="button"
                onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                className="zr-focus absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-[#704e60]/85 text-white"
                aria-label={`写真${index + 1}を外す`}
              >
                <X size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={selectFiles}
        className="sr-only"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= 2}
          className="zr-focus inline-flex min-h-11 items-center gap-2 border border-[#ded8dc] bg-white px-4 text-[11px] font-black text-[#40383e] disabled:opacity-40"
        >
          <ImagePlus size={17} className="text-[#f43679]" />写真 {files.length}/2
        </button>
        <span className="text-[10px] font-bold text-[#817981]">JPEG・PNG・WebP / 1枚4MBまで</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold text-[#817981]" aria-live="polite">{message || `${body.length} / 500`}</p>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="zr-focus min-h-11 px-3 text-[11px] font-black text-[#817981]">閉じる</button>
          )}
          <button
            type="submit"
            disabled={!body.trim() || submitting}
            className="zr-focus inline-flex min-h-11 items-center gap-2 bg-[#f43679] px-5 text-[12px] font-black text-white disabled:bg-[#c9c2c7]"
          >
            <Send size={16} />{submitting ? "送信中" : compact ? "返信する" : "投稿する"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ArtistFanBoard({ artistSlug, artistName }: BoardProps) {
  const [posts, setPosts] = useState<FanBoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadPosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/fan-board?artistSlug=${encodeURIComponent(artistSlug)}`, { cache: "no-store" });
      const result = (await response.json()) as FanBoardListResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "掲示板を読み込めませんでした");
      setPosts(result.posts);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "掲示板を読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }, [artistSlug]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function reportPost(postId: string) {
    if (!window.confirm("この投稿を運営に通報しますか？")) return;
    const form = new FormData();
    form.set("action", "report");
    form.set("artistSlug", artistSlug);
    form.set("postId", postId);
    form.set("reason", "other");
    const response = await fetch("/api/fan-board", { method: "POST", body: form });
    const result = (await response.json()) as FanBoardMutationResponse;
    setNotice(response.ok && result.ok ? "通報を受け付けました" : result.error || "通報できませんでした");
  }

  return (
    <div className="border-x border-b border-[#282127] bg-[#fff8fa]">
      <BoardComposer artistSlug={artistSlug} artistName={artistName} onPosted={loadPosts} />

      <div className="border-t border-[#282127] px-4 py-4 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.18em] text-[#f43679]">LATEST TALK</p>
            <h3 className="mt-1 text-[22px] font-black tracking-[-0.04em] text-[#1c171b]">みんなの書き込み</h3>
          </div>
          <span className="text-[11px] font-black text-[#817981]">{posts.length} POSTS</span>
        </div>
        {notice && <p className="mt-3 text-[11px] font-bold text-[#f43679]" aria-live="polite">{notice}</p>}

        {loading ? (
          <div className="mt-4 space-y-3" aria-label="掲示板を読み込み中">
            {[0, 1].map((item) => <div key={item} className="h-28 animate-pulse bg-[#ece6ea]" />)}
          </div>
        ) : error ? (
          <div className="mt-4 border border-[#ded8dc] bg-white p-4 text-center">
            <p className="text-[12px] font-bold text-[#817981]">{error}</p>
            <button type="button" onClick={() => void loadPosts()} className="zr-focus mt-3 min-h-11 px-4 text-[12px] font-black text-[#f43679]">もう一度読み込む</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-4 border border-dashed border-[#cfc6cc] bg-white px-5 py-6 text-center">
            <Camera size={26} className="mx-auto text-[#f43679]" aria-hidden="true" />
            <p className="mt-3 text-[14px] font-black text-[#1c171b]">最初の書き込みをしよう</p>
            <p className="mt-1 text-[11px] font-medium text-[#817981]">ライブのひとことや会場写真を気軽にどうぞ。</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#ded8dc] border-y border-[#282127]">
            {posts.map((post) => (
              <article key={post.id} className="bg-white py-4">
                <div className="px-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-black text-[#1c171b]">{post.displayName}</p>
                      <XHandleLink xHandle={post.xHandle} />
                      <time dateTime={post.createdAt} className="mt-1 block text-[9px] font-bold tracking-[0.1em] text-[#9a9298]">{formatDate(post.createdAt)}</time>
                    </div>
                    <button type="button" onClick={() => void reportPost(post.id)} className="zr-focus inline-flex min-h-10 items-center gap-1 px-2 text-[10px] font-bold text-[#9a9298]">
                      <Flag size={13} />通報
                    </button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-[14px] font-medium leading-6 text-[#292328]">{post.body}</p>
                  <PostPhotos post={post} />
                  <button
                    type="button"
                    onClick={() => setReplyingTo((current) => current === post.id ? null : post.id)}
                    className="zr-focus mt-3 inline-flex min-h-10 items-center gap-2 text-[11px] font-black text-[#f43679]"
                  >
                    <MessageCircle size={15} />返信する {post.replies.length > 0 ? `(${post.replies.length})` : ""}
                  </button>
                  {replyingTo === post.id && (
                    <BoardComposer
                      artistSlug={artistSlug}
                      artistName={artistName}
                      parentId={post.id}
                      compact
                      onCancel={() => setReplyingTo(null)}
                      onPosted={loadPosts}
                    />
                  )}
                </div>

                {post.replies.length > 0 && (
                  <div className="ml-7 mt-3 border-l border-[#f3a3bf] bg-[#fff7fa] px-4 py-1 sm:ml-12 sm:px-5">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="border-b border-[#eadfe4] py-4 last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-black text-[#1c171b]">{reply.displayName}</p>
                            <XHandleLink xHandle={reply.xHandle} />
                            <time dateTime={reply.createdAt} className="mt-1 block text-[9px] font-bold text-[#9a9298]">{formatDate(reply.createdAt)}</time>
                          </div>
                          <button type="button" onClick={() => void reportPost(reply.id)} className="zr-focus grid size-10 place-items-center text-[#9a9298]" aria-label="返信を通報">
                            <Flag size={13} />
                          </button>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-[13px] font-medium leading-6 text-[#40383e]">{reply.body}</p>
                        <PostPhotos post={reply} />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
