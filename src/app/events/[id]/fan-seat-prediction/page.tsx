"use client";

import { use, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { BottomNav } from "@/components/common/BottomNav";

const BUCKET = "fan-seat-predictions";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const COMMENT_MAX = 300;

const TAG_OPTIONS = [
  { value: "センステあり", label: "センステ" },
  { value: "花道あり", label: "花道" },
  { value: "バクステあり", label: "バクステ" },
  { value: "外周あり", label: "外周" },
  { value: "トロッコあり", label: "トロッコ" },
  { value: "演出予想", label: "演出予想" },
];

function fmtDate(d: string | null): string {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}（${w}）`;
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "image";
}

function StepIndicator({ step }: { step: number }) {
  const steps = [
    { num: 1, label: "入力" },
    { num: 2, label: "完了" },
  ];
  return (
    <div className="flex items-center justify-center py-3">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                step >= s.num ? "bg-[#FF6B9D] text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`mt-0.5 text-[9px] font-semibold ${
                step >= s.num ? "text-[#FF6B9D]" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-4 h-[2px] w-8 transition-colors ${
                step > s.num ? "bg-[#FF6B9D]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function FanSeatPredictionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<CrawledEvent | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types")
        .eq("id", eventId)
        .maybeSingle();
      setEvent(data as CrawledEvent | null);
    }
    load();
  }, [eventId]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFile(null);
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }
    if (selected.size > MAX_IMAGE_SIZE) {
      setError("画像は5MB以下にしてください。");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit() {
    setError("");
    if (!file) {
      setError("画像を選択してください。");
      return;
    }
    setSubmitting(true);
    try {
      const id = randomId();
      const imagePath = `${eventId}/${id}-${safeFileName(file.name)}`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(imagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);

      const { error: insertErr } = await supabase.from("fan_seat_predictions").insert({
        id,
        event_id: eventId,
        image_path: imagePath,
        comment: comment.trim() || null,
        prediction_tags: tags,
        display_name: null,
        approved: true,
      });
      if (insertErr) throw new Error(insertErr.message);

      setSubmitted(true);
    } catch (err) {
      setError(`投稿に失敗しました。もう一度お試しください。`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setComment("");
    setTags([]);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSubmitted(false);
  }

  const artistSlug = event ? findArtistByKeyword(event.title)?.slug : undefined;

  /* ── 完了画面（Step 2） ─────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans">
        <div className="mx-auto min-h-screen w-full max-w-[390px]">
          <div className="relative flex min-h-screen flex-col">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src="/images/report/success/report-success-bg.png"
                alt=""
                fill
                priority
                className="object-cover object-top"
              />
            </div>
            <header className="relative z-10 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white/80 backdrop-blur-sm">
              <Link
                href={`/events/${eventId}`}
                className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </Link>
              <h1 className="text-[12px] font-bold tracking-wide text-gray-900">予想図を投稿</h1>
            </header>
            <div className="relative z-10 bg-white/80 backdrop-blur-sm">
              <StepIndicator step={2} />
            </div>
            <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
              <div className="w-full rounded-3xl bg-white px-4 pb-8 pt-6 text-center shadow-[0_8px_40px_rgba(17,24,39,0.10)]">
                <div className="mb-4 flex justify-center">
                  <Image
                    src="/images/report/success/report-success-ticket-icon.png"
                    alt=""
                    width={140}
                    height={140}
                    className="object-contain"
                  />
                </div>
                <p className="text-[18px] font-bold text-[#111827]">投稿ありがとうございます！</p>
                <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
                  みんなの予想図に追加されました。
                  <br />
                  審査後に公演ページに表示されます。
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/events/${eventId}`)}
                    className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#FF6B9D] text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,107,157,0.35)] transition-opacity active:opacity-80"
                  >
                    公演ページに戻る
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex h-[48px] w-full items-center justify-center rounded-full border-2 border-[#FF6B9D] bg-white text-[14px] font-bold text-[#FF6B9D] transition-opacity active:opacity-80"
                  >
                    もう1枚投稿する
                  </button>
                </div>
              </div>
            </div>
            <BottomNav active="event" artistSlug={artistSlug} eventId={eventId} />
          </div>
        </div>
      </div>
    );
  }

  /* ── 入力画面（Step 1） ─────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="mx-auto min-h-screen w-full max-w-[390px] bg-white">
        <header className="sticky top-0 z-30 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white">
          <Link
            href={`/events/${eventId}`}
            className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
          <h1 className="text-[12px] font-bold tracking-wide text-gray-900">予想図を投稿</h1>
        </header>

        <StepIndicator step={1} />

        <main className="space-y-3 px-3 pb-8 pt-1">
          {/* 対象公演 */}
          <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <h2 className="text-[13px] font-bold text-gray-900">対象公演</h2>
            {event ? (
              <div className="mt-2 space-y-0.5">
                <p className="text-[13px] font-bold text-[#111827]">{event.title}</p>
                <p className="text-[11px] text-gray-500">{event.venue}</p>
                <p className="text-[11px] text-gray-500">{fmtDate(event.date)}</p>
              </div>
            ) : (
              <div className="mt-2 h-10 animate-pulse rounded-lg bg-gray-100" />
            )}
          </section>

          {/* 予想図画像 */}
          <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] font-bold text-gray-900">予想図画像</h2>
              <span className="rounded-md bg-[#FFF1F6] px-1.5 py-0.5 text-[9px] font-bold text-[#FF6B9D]">
                必須
              </span>
            </div>
            <p className="mt-0.5 text-[9px] text-gray-400">
              マップをスクショしてスマホの編集機能で花道・センステを書き込んだ画像
            </p>

            {previewUrl ? (
              <div className="relative mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="投稿画像プレビュー"
                  className="w-full rounded-xl bg-gray-50 object-contain"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white active:bg-black/70"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex h-[96px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors active:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px] font-semibold">画像を選択</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </section>

          {/* 予想タグ */}
          <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] font-bold text-gray-900">予想タグ</h2>
              <span className="text-[9px] text-gray-400">任意</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`h-8 w-full rounded-lg text-[11px] font-semibold transition-colors ${
                    tags.includes(tag.value)
                      ? "bg-[#FF6B9D] text-white shadow-[0_2px_8px_rgba(255,107,157,0.2)]"
                      : "border border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </section>

          {/* コメント */}
          <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] font-bold text-gray-900">コメント</h2>
              <span className="text-[9px] text-gray-400">任意</span>
            </div>
            <textarea
              value={comment}
              maxLength={COMMENT_MAX}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder={`例：センステがA3ブロック付近にありそう\n例：昨年の公演からして花道は外周ありそう`}
              className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-2 py-2 text-[10px] leading-5 outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
            />
            <div className="mt-1 text-right text-[9px] text-gray-400">
              {comment.length} / {COMMENT_MAX}
            </div>
          </section>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-[11px] text-red-600">{error}</div>
          )}

          <button
            type="button"
            disabled={!file || submitting}
            onClick={handleSubmit}
            className={`flex h-12 w-full items-center justify-center rounded-xl text-[13px] font-bold text-white transition-opacity ${
              file && !submitting
                ? "bg-[#FF6B9D] shadow-[0_8px_20px_rgba(255,107,157,0.25)] active:opacity-80"
                : "cursor-not-allowed bg-[#FF6B9D]/40"
            }`}
          >
            {submitting ? "投稿中..." : "予想図を投稿する"}
          </button>

          <Link
            href={`/events/${eventId}`}
            className="flex h-10 w-full items-center justify-center rounded-xl border border-gray-200 bg-white text-[12px] font-bold text-gray-500 transition-opacity active:opacity-70"
          >
            キャンセル
          </Link>
        </main>

        <BottomNav active="event" artistSlug={artistSlug} eventId={eventId} />
      </div>
    </div>
  );
}
