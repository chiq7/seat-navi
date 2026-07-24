"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase/client";
import { ShareButton } from "@/components/common/ShareButton";

const VOTER_KEY_STORAGE = "seat-navi-voter-key";

function getOrCreateVoterKey(): string {
  const existing = localStorage.getItem(VOTER_KEY_STORAGE);
  if (existing) return existing;
  const created = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  localStorage.setItem(VOTER_KEY_STORAGE, created);
  return created;
}

function fmtPostDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export type SeatPredictionCardProps = {
  /** 共有URL生成用。/events/[eventId]?prediction=predictionId の組み立てに使用。未指定時はモーダル内の共有ボタンを表示しない */
  eventId?: string;
  predictionId: string;
  imageUrl: string;
  comment?: string | null;
  tags?: string[];
  venue?: string | null;
  dateLabel: string;
  /** 投稿日時（ISO文字列）。既にdateLabel側で投稿日を表示している呼び出し元では渡さない */
  createdAt?: string | null;
  likeCount: number;
  liked?: boolean;
  rank?: number | null;
  detailHref?: string | null;
  onLiked?: () => void;
  /** 指定時はモーダル開閉を外部制御（URL連動など）。未指定時は従来通りカード内部で開閉を管理する */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SeatPredictionCard({
  eventId,
  predictionId,
  imageUrl,
  comment = null,
  tags = [],
  venue = null,
  dateLabel,
  createdAt = null,
  likeCount,
  liked = false,
  rank = null,
  onLiked,
  open,
  onOpenChange,
}: SeatPredictionCardProps) {
  const [localVote, setLocalVote] = useState<{
    predictionId: string;
    baseCount: number;
    increment: boolean;
  } | null>(null);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isControlled = open !== undefined;
  const modalOpen = isControlled ? open : internalModalOpen;
  const isTop = rank === 1;
  const activeLocalVote = localVote?.predictionId === predictionId ? localVote : null;
  const picked = liked || activeLocalVote !== null;
  const count =
    likeCount +
    (activeLocalVote?.increment && !liked && likeCount <= activeLocalVote.baseCount ? 1 : 0);

  function openModal() {
    if (!isControlled) setInternalModalOpen(true);
    onOpenChange?.(true);
  }

  function closeModal() {
    if (!isControlled) setInternalModalOpen(false);
    onOpenChange?.(false);
  }

  async function handleLike() {
    if (picked) return;
    const voterKey = getOrCreateVoterKey();
    const { error } = await supabase.from("fan_seat_prediction_votes").insert({
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 20),
      prediction_id: predictionId,
      voter_key: voterKey,
    });
    if (error) {
      if (error.code === "23505") {
        setLocalVote({ predictionId, baseCount: likeCount, increment: false });
      }
      return;
    }
    setLocalVote({ predictionId, baseCount: likeCount, increment: true });
    onLiked?.();
  }

  const venueDateLabel = venue ? `${venue} ${dateLabel}` : dateLabel;
  const postDateLabel = createdAt ? fmtPostDate(createdAt) : null;

  return (
    <div
      className={
        isTop
          ? "border border-pink-200 bg-white p-3"
          : undefined
      }
    >
      {isTop && (
        <div className="mb-1.5 flex justify-center">
          <div className="h-[50px] w-[300px] max-w-full">
            <Image
              src="/images/seat-prediction/rank-1-title.png"
              alt="座席予想1位の投稿"
              width={300}
              height={50}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}
      {/* 上部情報バー（いいね操作。カード本体とはDOM上で分離されているためモーダルを開かない） */}
      <div className="flex items-center justify-between gap-2 border border-b-0 border-[#E9DCC3] bg-white px-3 py-1.5">
        <span className="min-w-0 truncate text-[10px] font-semibold text-gray-600">
          {venueDateLabel}
        </span>
        <div
          className={`flex h-6 shrink-0 items-stretch overflow-hidden rounded-full border border-[#FF6B9D]/40 bg-[#FFF1F6] ${
            picked ? "opacity-60" : ""
          }`}
        >
          <button
            type="button"
            onClick={handleLike}
            disabled={picked}
            className="flex items-center gap-1 px-2 text-[10px] font-semibold text-[#FF6B9D] transition-opacity active:opacity-70"
          >
            <span>♡</span>
            <span>いいね</span>
          </button>
          <span className="flex items-center border-l border-[#FF6B9D]/30 px-2 text-[10px] font-semibold text-[#FF6B9D]">
            {count}件
          </span>
        </div>
      </div>

      {/* カード本体（タップで全画面モーダルを開く）。上下にpaddingを持たせ、画像が枠線の内側に収まるようにする */}
      <article
        className="relative overflow-hidden border border-t-0 border-gray-100 bg-white py-2 shadow-sm"
        style={
          isTop
            ? {
                backgroundImage: "url('/images/arena-prediction/rank-1-bg5.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div
          role="button"
          tabIndex={0}
          onClick={openModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal();
            }
          }}
          className="flex h-[120px] cursor-pointer gap-2 overflow-hidden"
        >
          {/* 画像はカード内padding無しで左端・上端・下端まで表示（bleed表示）。
              行の高さを画像と同じ120pxに固定しているため、テキストが長くても画像がカード外へはみ出さない */}
          <div className="h-[120px] w-[168px] shrink-0 overflow-hidden rounded-xl bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="予想図" className="h-full w-full object-cover" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between overflow-hidden py-2 pr-2">
            <div className="min-w-0 overflow-hidden">
              {tags.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#FFF5F8] px-1.5 py-0.5 text-[9px] font-bold text-[#FF6B9D]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {comment && (
                <p className="line-clamp-2 overflow-hidden text-[11px] leading-snug text-[#111827]">
                  {comment}
                </p>
              )}
            </div>
            {postDateLabel && (
              <p className="text-right text-[9px] text-gray-400">投稿日 {postDateLabel}</p>
            )}
          </div>
        </div>
      </article>

      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
            onClick={closeModal}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeModal}
                aria-label="閉じる"
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-[18px] text-white leading-none"
              >
                ×
              </button>
              <div className="overflow-y-auto">
                <div className="w-full bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="予想図"
                    className="h-auto w-full object-contain"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[12px] font-semibold text-gray-600">
                      {venueDateLabel}
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold text-[#FF6B9D]">
                      ♡ いいね {count}件
                    </span>
                  </div>
                  {postDateLabel && (
                    <p className="mt-1 text-[11px] text-gray-400">投稿日 {postDateLabel}</p>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#FFF5F8] px-2.5 py-1 text-[11px] font-bold text-[#FF6B9D]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {comment && (
                    <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#111827]">
                      {comment}
                    </p>
                  )}

                  {/* 下部アクション領域（いいねはカード上部にあるためここでは共有のみ） */}
                  {eventId && (
                    <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-gray-100 pt-3">
                      <span className="text-[11px] font-semibold text-gray-500">共有</span>
                      <ShareButton
                        url={
                          typeof window !== "undefined"
                            ? `${window.location.origin}/events/${eventId}?prediction=${predictionId}`
                            : ""
                        }
                        text={`${venueDateLabel} の座席予想🗺️ #ちけレポ`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
