"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ImagePlus, Map as MapIcon, Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import type { CrawledEvent, SeatReport } from "@/lib/types";
import { AccountLink } from "@/components/auth/AccountLink";
import { BottomNav } from "@/components/common/BottomNav";
import { EventCarouselPicker } from "@/components/common/EventPicker";
import { ShareButton } from "@/components/common/ShareButton";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";

const EVENT_COLUMNS = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";

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
    <div className="zr-container flex items-start justify-between border-b border-[#ded8dc] py-5">
      {steps.map((s, i) => (
        <div key={s.num} className="flex min-w-0 flex-1 items-start last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-7 w-7 items-center justify-center border text-[10px] font-black transition-colors ${
                step >= s.num ? "border-[#f43679] bg-[#f43679] text-white" : "border-[#cfc7cc] text-[#958d93]"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`mt-1.5 text-[9px] font-black ${
                step >= s.num ? "text-[#f43679]" : "text-[#958d93]"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mt-3 h-px flex-1 transition-colors ${
                step > s.num ? "bg-[#f43679]" : "bg-[#ded8dc]"
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

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSaved, setMapSaved] = useState(false);
  const [groupSeatReports, setGroupSeatReports] = useState<SeatReport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedEventId(eventId);
  }, [eventId]);

  useEffect(() => {
    async function load() {
      setEventsLoading(true);
      const { data: anchor } = await supabase
        .from("events")
        .select(EVENT_COLUMNS)
        .eq("id", eventId)
        .maybeSingle();
      const anchorEvent = (anchor as CrawledEvent | null) ?? null;
      const targetSlug = anchorEvent
        ? (anchorEvent.artist_slug ?? resolveArtist(anchorEvent)?.slug ?? null)
        : null;

      let list = targetSlug ? await getEventsForArtist(targetSlug) : [];
      if (anchorEvent && !list.some((e) => e.id === anchorEvent.id)) {
        list = [anchorEvent, ...list];
      }

      setEvents(list);
      setEventsLoading(false);
    }
    load();
  }, [eventId]);

  const event = events.find((e) => e.id === selectedEventId) ?? null;

  // 同一会場（venue_id一致）×隣接日程（間隔3日以内）でつながる公演群。
  // /events/[id]と同じロジックで、マップに表示する座席報告を近接日程間で統合する。
  const ADJACENT_GAP_DAYS = 3;
  const groupEventIds = useMemo(() => {
    if (!event) return [];
    if (!event.venue_id) return [event.id];
    const sameVenue = events.filter((ev) => ev.venue_id === event.venue_id && ev.date);
    const sorted = [...sameVenue].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const groups: CrawledEvent[][] = [];
    let current: CrawledEvent[] = [];
    for (const ev of sorted) {
      if (current.length === 0) {
        current = [ev];
        continue;
      }
      const prevDate = current[current.length - 1].date!;
      const gapDays = Math.round(
        (new Date(ev.date!).getTime() - new Date(prevDate).getTime()) / 86400000,
      );
      if (gapDays <= ADJACENT_GAP_DAYS) {
        current.push(ev);
      } else {
        groups.push(current);
        current = [ev];
      }
    }
    if (current.length > 0) groups.push(current);
    const myGroup = groups.find((g) => g.some((ev) => ev.id === event.id));
    return myGroup ? myGroup.map((ev) => ev.id) : [event.id];
  }, [event, events]);

  useEffect(() => {
    if (groupEventIds.length === 0) {
      setGroupSeatReports([]);
      return;
    }
    let cancelled = false;
    async function loadGroupReports() {
      const { data } = await supabase
        .from("seat_reports")
        .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
        .in("event_id", groupEventIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled && data) setGroupSeatReports(data as SeatReport[]);
    }
    loadGroupReports();
    return () => {
      cancelled = true;
    };
  }, [groupEventIds]);

  // マップ表示用：同一座席に複数報告がある場合、選択中の日程の報告を優先する。
  const dedupedSeatReports = useMemo(() => {
    const byPosition = new Map<string, SeatReport[]>();
    for (const r of groupSeatReports) {
      const key = `${r.block}:${r.row_num}:${r.seat_num}`;
      if (!byPosition.has(key)) byPosition.set(key, []);
      byPosition.get(key)!.push(r);
    }
    const result: SeatReport[] = [];
    for (const reps of byPosition.values()) {
      result.push(reps.find((r) => r.event_id === selectedEventId) ?? reps[0]);
    }
    return result;
  }, [groupSeatReports, selectedEventId]);

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
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      const imagePath = userId
        ? `${userId}/${selectedEventId}/${id}-${safeFileName(file.name)}`
        : `${selectedEventId}/${id}-${safeFileName(file.name)}`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(imagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadErr) throw new Error(uploadErr.message);

      const { error: insertErr } = await supabase.from("fan_seat_predictions").insert({
        id,
        event_id: selectedEventId,
        user_id: userId,
        image_path: imagePath,
        comment: comment.trim() || null,
        prediction_tags: tags,
        display_name: null,
        approved: true,
      });
      if (insertErr) throw new Error(insertErr.message);

      trackEvent("report_submit", {
        report_type: "arena_prediction",
        event_id: selectedEventId,
        tag_count: tags.length,
        has_comment: Boolean(comment.trim()),
      });
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

  const artist = event ? resolveArtist(event) : undefined;
  const artistSlug = artist?.slug;
  const reportEntryHref = `/report?event=${selectedEventId}`;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${selectedEventId}` : "";
  const shareText = `${artist?.name ?? "ライブ"}の座席表・ステージ構成予想を投稿しました！ #ちけレポ`;
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  /* ── 完了画面（Step 2） ─────────────────────────────── */
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f5f6] pb-20 font-sans text-[#1c171b]">
        <section className="bg-[#0d090d] text-white">
          <header className="zr-container flex h-16 items-center justify-between">
            <Link href={`/events/${selectedEventId}`} aria-label="公演ページへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/8"><ChevronLeft size={25} /></Link>
            <AccountLink tone="light" iconSize={22} />
          </header>
          <div className="zr-container pb-11 pt-5 text-center">
            <p className="text-[10px] font-black tracking-[0.22em] text-[#ff5b96]">PREDICTION COMPLETE</p>
            <h1 className="mt-4 text-[38px] font-black leading-tight tracking-[-0.05em]">予想図を投稿しました。</h1>
            <p className="mt-3 text-[12px] font-bold leading-6 text-white/62">会場の座席表を探すファンへ、あなたの予想が届きます。</p>
          </div>
        </section>
        <StepIndicator step={2} />
        <main className="zr-container flex-1 py-6">
          <section className="border border-[#ded8dc] bg-white p-5 text-center sm:p-7">
            <ImagePlus size={32} strokeWidth={1.5} className="mx-auto text-[#f43679]" aria-hidden="true" />
            <p className="mt-4 text-[17px] font-black">Xで座席予想を共有しよう</p>
            <p className="mt-2 text-[11px] font-medium leading-5 text-[#817981]">公演ページのURLと一緒にシェアできます。</p>
            <div className="mt-6 grid grid-cols-[1fr_52px] gap-2">
              <a href={xShareHref} target="_blank" rel="noopener noreferrer" className="zr-focus flex min-h-[52px] items-center justify-center bg-[#1c171b] text-[13px] font-black text-white">Xで共有する</a>
              <ShareButton url={shareUrl} text={shareText} className="zr-focus flex h-[52px] w-[52px] items-center justify-center border border-[#1c171b] text-[#1c171b]" />
            </div>
            <div className="mt-7 space-y-2 border-t border-[#ded8dc] pt-6">
              <button type="button" onClick={resetForm} className="zr-focus flex min-h-[52px] w-full items-center justify-center bg-[#f43679] text-[13px] font-black text-white">別の予想を投稿する</button>
              <Link href={`/events/${selectedEventId}`} className="zr-focus flex min-h-12 w-full items-center justify-center border border-[#ded8dc] bg-white text-[13px] font-black text-[#544e52]">座席予想ページを見る</Link>
            </div>
          </section>
        </main>
        <BottomNav active="event" artistSlug={artistSlug} eventId={selectedEventId} />
      </div>
    );
  }

  /* ── 入力画面（Step 1） ─────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f7f5f6] pb-20 font-sans text-[#1c171b]">
      <section className="bg-[#0d090d] text-white">
        <header className="zr-container flex h-16 items-center justify-between">
          <Link href={reportEntryHref} aria-label="報告メニューへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/8"><ChevronLeft size={26} /></Link>
          <AccountLink tone="light" iconSize={22} />
        </header>
        <div className="zr-container pb-9 pt-4">
          <MapIcon size={28} strokeWidth={1.6} className="text-[#ff5b96]" aria-hidden="true" />
          <p className="mt-5 text-[10px] font-black tracking-[0.22em] text-[#ff5b96]">FAN SEAT PREDICTION</p>
          <h1 className="mt-3 text-[36px] font-black leading-[1.08] tracking-[-0.05em] sm:text-[52px]">会場の座席表を、<br />みんなで予想。</h1>
          <p className="mt-4 text-[11px] font-bold leading-5 text-white/62">花道・センステ・外周など、ライブ会場の構成予想を投稿できます。</p>
        </div>
      </section>

        <StepIndicator step={1} />

        <main className="zr-container space-y-8 pb-12 pt-8">
          {/* 対象公演 */}
          <section className="border-t border-[#1c171b] pt-5">
            <p className="artist-kicker">01 / SELECT LIVE</p>
            <h2 className="artist-heading">対象公演</h2>
            <EventCarouselPicker
              events={events}
              selectedEventId={selectedEventId}
              onSelect={setSelectedEventId}
              loading={eventsLoading}
            />
          </section>

          {/* 予想図画像 */}
          <section className="border-t border-[#1c171b] pt-5">
            <div className="flex items-center gap-1.5">
              <h2 className="artist-heading">予想図画像</h2>
              <span className="border border-[#f43679] px-1.5 py-0.5 text-[9px] font-black text-[#f43679]">
                必須
              </span>
            </div>
            <p className="mt-0.5 text-[9px] text-gray-400">
              会場マップの画像に花道・センステの位置を書き込んで投稿できます
            </p>

            {!previewUrl && event && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setMapOpen((o) => !o)}
                  className="zr-focus flex min-h-12 w-full items-center justify-center gap-1 border border-[#f43679] bg-[#fff0f5] text-[11px] font-black text-[#f43679]"
                >
                  {mapOpen ? "▲ マップを閉じる" : "▼ 会場マップから予想図を作る"}
                </button>

                {mapOpen && (
                  <div className="mt-2 border border-[#f43679]/25 bg-[#fff0f5] p-4">
                    <ol className="space-y-1 text-[10px] leading-relaxed text-gray-600">
                      <li>
                        <span className="font-bold text-[#FF6B9D]">①</span> 下のボタンでマップ画像をスマホに保存
                      </li>
                      <li>
                        <span className="font-bold text-[#FF6B9D]">②</span> 写真アプリなどの編集機能で花道・センステの位置を書き込む
                      </li>
                      <li>
                        <span className="font-bold text-[#FF6B9D]">③</span> 書き込んだ画像を下の「画像を選択」からアップロード
                      </li>
                    </ol>
                    <div className="mt-3">
                      <EventArenaMap
                        eventId={selectedEventId}
                        reports={dedupedSeatReports}
                        showSaveButton
                        onSaved={() => setMapSaved(true)}
                      />
                    </div>
                    {mapSaved && (
                      <p className="mt-2 text-center text-[10px] font-bold text-[#FF6B9D]">
                        保存できました！②③の手順で編集してから、下の「画像を選択」からアップロードしてください
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {previewUrl ? (
              <div className="relative mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="投稿画像プレビュー"
                  className="w-full border border-[#ded8dc] bg-[#f7f5f6] object-contain"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="zr-focus absolute right-2 top-2 flex h-11 w-11 items-center justify-center bg-black/65 text-white"
                  aria-label="画像を削除"
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
                className={`zr-focus mt-3 flex min-h-[112px] w-full flex-col items-center justify-center gap-2 border border-dashed transition-colors ${
                  mapSaved
                    ? "border-[#f43679] bg-[#fff0f5] text-[#f43679]"
                    : "border-[#bfb6bc] bg-white text-[#817981]"
                }`}
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
          <section className="border-t border-[#ded8dc] pt-5">
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
                  className={`zr-focus min-h-11 w-full border text-[10px] font-black transition-colors ${
                    tags.includes(tag.value)
                      ? "border-[#f43679] bg-[#f43679] text-white"
                      : "border-[#ded8dc] bg-white text-[#544e52]"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </section>

          {/* コメント */}
          <section className="border-t border-[#ded8dc] pt-5">
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
              className="zr-focus mt-3 w-full resize-none border border-[#ded8dc] bg-white p-3 text-[12px] font-medium leading-6 outline-none placeholder:text-[#b5adb2] focus:border-[#f43679]"
            />
            <div className="mt-1 text-right text-[9px] text-gray-400">
              {comment.length} / {COMMENT_MAX}
            </div>
          </section>

          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-[11px] font-bold text-red-600">{error}</div>
          )}

          <button
            type="button"
            disabled={!file || submitting}
            onClick={handleSubmit}
            className={`zr-focus flex min-h-[52px] w-full items-center justify-center gap-2 text-[13px] font-black text-white transition-opacity ${
              file && !submitting
                ? "bg-[#f43679]"
                : "cursor-not-allowed bg-[#f43679]/35"
            }`}
          >
            <Send size={16} aria-hidden="true" />
            {submitting ? "投稿中..." : "予想図を投稿する"}
          </button>

          <Link
            href={`/events/${selectedEventId}`}
            className="zr-focus flex min-h-12 w-full items-center justify-center border border-[#ded8dc] bg-transparent text-[12px] font-black text-[#817981]"
          >
            キャンセル
          </Link>
        </main>

        <BottomNav active="event" artistSlug={artistSlug} eventId={selectedEventId} />
    </div>
  );
}
