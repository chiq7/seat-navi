"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

const BUCKET = "fan-seat-predictions";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const COMMENT_MAX = 300;
const DISPLAY_NAME_MAX = 30;

const TAG_OPTIONS = [
  { value: "センステあり", label: "センステ" },
  { value: "花道あり", label: "花道" },
  { value: "外周あり", label: "外周" },
  { value: "ムビステあり", label: "トロッコ" },
  { value: "機材席あり", label: "機材席" },
  { value: "その他", label: "その他" },
];

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

function safeFileName(name: string): string {
  const fallback = "prediction-image";
  const cleaned = name
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function fmtEventOptionDate(d: string | null) {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

export default function FanSeatPredictionPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const [currentEvent, setCurrentEvent] = useState<CrawledEvent | null>(null);
  const [eventOptions, setEventOptions] = useState<CrawledEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(
    () => !!file && !!selectedEventId && !submitting && !submitted,
    [file, selectedEventId, submitting, submitted],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEventOptions() {
      const { data: evData } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types")
        .eq("id", eventId)
        .maybeSingle();

      if (cancelled) return;

      const loadedEvent = evData as CrawledEvent | null;
      setCurrentEvent(loadedEvent);

      const artist = loadedEvent ? findArtistByKeyword(loadedEvent.title) : undefined;
      if (!artist) {
        setEventOptions(loadedEvent ? [loadedEvent] : []);
        return;
      }

      const orFilter = artist.keywords.map(kw => `title.ilike.%${kw}%`).join(",");
      const { data: relatedData } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types")
        .or(orFilter)
        .order("date", { ascending: true });

      if (cancelled) return;

      const relatedEvents = ((relatedData as CrawledEvent[]) ?? [])
        .filter(ev => ev.date || ev.id === eventId);
      setEventOptions(relatedEvents.length > 0 ? relatedEvents : loadedEvent ? [loadedEvent] : []);
    }

    loadEventOptions();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  function resetForm() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setComment("");
    setDisplayName("");
    setTags([]);
    setError("");
    setSubmitted(false);
  }

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

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("画像を選択してください。");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください。");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("画像は5MB以下にしてください。");
      return;
    }
    if (comment.length > COMMENT_MAX) {
      setError("コメントは300文字以内にしてください。");
      return;
    }
    if (displayName.length > DISPLAY_NAME_MAX) {
      setError("表示名は30文字以内にしてください。");
      return;
    }

    setSubmitting(true);
    try {
      const id = randomId();
      const targetEventId = selectedEventId;
      const imagePath = `${targetEventId}/${id}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(imagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      const { error: insertError } = await supabase.from("fan_seat_predictions").insert({
        id,
        event_id: targetEventId,
        image_path: imagePath,
        comment: comment.trim() || null,
        prediction_tags: tags,
        display_name: displayName.trim() || null,
        approved: true,
      });
      if (insertError) throw new Error(insertError.message);

      setSubmitted(true);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl("");
      setComment("");
      setDisplayName("");
      setTags([]);
    } catch (err) {
      setError(`投稿に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[360px] items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-sm font-bold text-gray-500">
            戻る
          </Link>
          <h1 className="text-base font-bold text-gray-900">予想画像を投稿する</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[360px] overflow-hidden px-4 pt-4">
        {submitted ? (
          <div className="w-full min-w-0 rounded-2xl bg-white p-5 text-center shadow-sm">
            <p className="text-base font-extrabold text-gray-900">投稿ありがとうございます！</p>
            <p className="mt-2 text-sm font-bold text-purple-700">
              みんなの座席予想に掲載されました。
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              イベントページで投稿を確認できます。
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2">
              <Link
                href={`/events/${selectedEventId}`}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white"
              >
                イベントページに戻る
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700"
              >
                もう1枚投稿する
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-gray-800">みんなの座席予想</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              座席報告マップのスクショに、花道・センステ予想を書き込んだ画像を投稿できます。投稿後すぐに掲載されます。
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">表示名</label>
            <input
              type="text"
              value={displayName}
              maxLength={DISPLAY_NAME_MAX}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="未入力なら匿名"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">
              投稿する公演 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none"
            >
              {eventOptions.length === 0 && (
                <option value={eventId}>
                  {currentEvent ? `${fmtEventOptionDate(currentEvent.date)} ${currentEvent.venue}` : "読み込み中..."}
                </option>
              )}
              {eventOptions.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {fmtEventOptionDate(ev.date)} {ev.venue}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">
              画像 <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full min-w-0 max-w-full text-xs text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
            />
            <p className="mt-1 text-[10px] text-gray-400">image/*、5MB以下</p>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="投稿画像プレビュー" className="mt-3 max-h-72 w-full rounded-xl bg-gray-50 object-contain" />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">予想タグ</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`min-w-0 truncate rounded-full border px-3 py-1.5 text-xs font-bold ${
                    tags.includes(tag.value)
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700">コメント</label>
            <textarea
              rows={4}
              value={comment}
              maxLength={COMMENT_MAX}
              onChange={(e) => setComment(e.target.value)}
              placeholder="予想のポイントや気になる空白を書いてください"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">{comment.length}/{COMMENT_MAX}</p>
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-gray-900 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "投稿中..." : "投稿する"}
          </button>
        </form>
        )}
      </main>
    </div>
  );
}
