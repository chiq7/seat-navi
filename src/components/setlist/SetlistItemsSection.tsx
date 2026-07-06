"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import type { EditableItem } from "@/lib/setlistHelpers";

const LABEL_ICONS: Record<string, string> = {
  MC: "/images/setlist/icons/setlist-mc.png",
  トーク: "/images/setlist/icons/setlist-talk.png",
  VCR: "/images/setlist/icons/setlist-vcr.png",
  メドレー開始: "/images/setlist/icons/setlist-medley-start.png",
  メドレー終了: "/images/setlist/icons/setlist-medley-end.png",
  ダンスチャレンジ: "/images/setlist/icons/setlist-dance-challenge.png",
  ラストMC: "/images/setlist/icons/setlist-mc.png",
};

type Props = {
  setlistItems: EditableItem[];
  songNumbers: Map<string, string>;
  onMove: (index: number, dir: "up" | "down") => void;
  onRemove: (id: string) => void;
  showAddForm: boolean;
  onOpenAddForm: () => void;
  addFormNode: ReactNode;
};

function AddSetlistButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center active:opacity-70"
    >
      <Image
        src="/images/setlist/setlist-add-button.png"
        alt="セトリを追加"
        width={2172}
        height={724}
        className="h-16 w-auto object-contain"
      />
    </button>
  );
}

export function SetlistItemsSection({
  setlistItems,
  songNumbers,
  onMove,
  onRemove,
  showAddForm,
  onOpenAddForm,
  addFormNode,
}: Props) {
  const [isEditMode, setIsEditMode] = useState(false);
  const songCount = setlistItems.filter(i => i.type === "song").length;
  const total = setlistItems.length;
  const addSlot = showAddForm
    ? <div className="w-full">{addFormNode}</div>
    : <AddSetlistButton onClick={onOpenAddForm} />;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-b from-white via-[#FFF8FB] to-white shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
      {/* 右上ピンクグロー */}
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#FF6B9D]/[0.07] blur-2xl" />
      {/* 左下ピンクグロー */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-16 rounded-full bg-[#FF6B9D]/[0.05] blur-xl" />

      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Image
            src="/images/setlist/setlist-logo-cropped.png"
            alt="セトリ"
            width={120}
            height={36}
            className="h-[36px] w-auto object-contain"
          />
          <span className="rounded-full bg-[#FFF1F6] px-2.5 py-0.5 text-[10px] font-bold text-[#FF6B9D]">
            {songCount}曲
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditMode(prev => !prev)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            isEditMode ? "bg-gray-100 text-gray-700" : "text-[#FF6B9D]"
          }`}
        >
          {isEditMode ? "完了" : "編集"}
        </button>
      </div>

      {setlistItems.length === 0 ? (
        <div className={`flex flex-col items-center px-4 pt-6 ${showAddForm ? "gap-1 pb-1" : "gap-0.5 pb-0.5"}`}>
          <p className="text-center text-[12px] text-gray-400">
            まだ曲が追加されていません
          </p>
          {addSlot}
        </div>
      ) : (
        <div className="divide-y divide-gray-100/60">
          {setlistItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === total - 1;

            const editControls = isEditMode ? (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onMove(index, "up")}
                  disabled={isFirst}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 disabled:opacity-25 active:bg-gray-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onMove(index, "down")}
                  disabled={isLast}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 disabled:opacity-25 active:bg-gray-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 active:bg-red-50 active:text-red-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null;

            if (item.type === "encore") {
              return (
                <div key={item.id} className="flex items-center bg-[#FFF8FB] px-3 py-0.5">
                  <div className="h-px flex-1 bg-[#FF6B9D]/25" />
                  <span className="mx-2 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#FFF1F6] px-1.5 py-0 text-[10px] font-semibold text-[#FF6B9D]">
                    <Image src="/images/setlist/icons/setlist-encore.png" alt="" width={16} height={16} className="object-contain" />
                    アンコール
                  </span>
                  <div className="h-px flex-1 bg-[#FF6B9D]/25" />
                  {editControls}
                </div>
              );
            }

            if (item.type === "mc" || item.type === "separator" || item.type === "tag") {
              const label = item.type === "mc" ? "MC" : item.label;
              const iconSrc = LABEL_ICONS[label];
              return (
                <div key={item.id} className="flex items-center px-3 py-0">
                  <div className="h-px flex-1 bg-[#FF6B9D]/15" />
                  <span className="mx-1.5 inline-flex shrink-0 items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1.5 py-0 text-[10px] font-semibold leading-none text-[#FF6B9D]">
                    {iconSrc && <Image src={iconSrc} alt="" width={14} height={14} className="object-contain" />}
                    {label}
                  </span>
                  <div className="h-px flex-1 bg-[#FF6B9D]/15" />
                  {editControls}
                </div>
              );
            }

            // song
            const num = songNumbers.get(item.id) ?? "";
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="flex h-[15px] w-[19px] shrink-0 items-center justify-center rounded bg-[#FFF1F6] text-[9px] font-bold text-[#FF6B9D]">
                  {num}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800">
                  {item.title}
                </span>
                {editControls}
              </div>
            );
          })}
        </div>
      )}
      {setlistItems.length > 0 && (
        <div className={`border-t border-gray-100/60 ${showAddForm ? "px-2 py-0.5" : "px-3 py-0.5"}`}>
          {addSlot}
        </div>
      )}
    </div>
  );
}
