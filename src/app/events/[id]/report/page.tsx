"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { SEAT_LOTTERY_OPTIONS } from "@/lib/types";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [block, setBlock] = useState("");
  const [rowNum, setRowNum] = useState("");
  const [seatNum, setSeatNum] = useState("");
  const [lotteryType, setLotteryType] = useState<string>("fc1");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const row = parseInt(rowNum, 10);
    const seat = parseInt(seatNum, 10);
    if (!block.trim()) { setError("ブロック名を入力してください"); return; }
    if (!row || row < 1) { setError("列番号は1以上の数値を入力してください"); return; }
    if (!seat || seat < 1) { setError("席番号は1以上の数値を入力してください"); return; }

    setSubmitting(true);
    const { error: dbErr } = await supabase.from("seat_reports").insert({
      id: randomId(),
      event_id: eventId,
      block: block.trim(),
      row_num: row,
      seat_num: seat,
      lottery_type: lotteryType,
      comment: comment.trim() || null,
    });

    if (dbErr) {
      setError("投稿に失敗しました: " + dbErr.message);
      setSubmitting(false);
      return;
    }

    router.push(`/events/${eventId}?reported=1`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900">座席を報告</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 px-4 pt-5">
        {/* ブロック */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-xs font-bold text-gray-700">
            ブロック / エリア名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            placeholder="例: A3, アリーナB, SS席"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* 列・席 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">
                列番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={rowNum}
                onChange={(e) => setRowNum(e.target.value)}
                placeholder="例: 5"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700">
                席番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={seatNum}
                onChange={(e) => setSeatNum(e.target.value)}
                placeholder="例: 12"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>
        </div>

        {/* 抽選種別 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-2 block text-xs font-bold text-gray-700">
            抽選種別 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SEAT_LOTTERY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLotteryType(opt.value)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  lotteryType === opt.value
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[var(--accent)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* コメント */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-xs font-bold text-gray-700">
            コメント（任意）
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="花道が近かった、見やすかった など"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* エラー */}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 送信 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-dark)] active:scale-95 disabled:opacity-60"
        >
          {submitting ? "投稿中..." : "報告する ✍️"}
        </button>
      </form>
    </div>
  );
}
