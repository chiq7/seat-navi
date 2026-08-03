"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Mic2, Music2, Plus, Sparkles, X } from "lucide-react";
import type { EditableItem } from "@/lib/setlistHelpers";

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
      className="zr-focus flex min-h-14 w-full items-center justify-between border border-[#1c171b] bg-[#1c171b] px-4 text-left text-white transition-colors hover:bg-[#f43679]"
    >
      <span>
        <span className="block text-[9px] font-black tracking-[0.18em] text-white/55">ADD TO SETLIST</span>
        <span className="mt-0.5 block text-[13px] font-black">曲・MC・演出を追加</span>
      </span>
      <Plus size={20} aria-hidden="true" />
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
  const songCount = setlistItems.filter((item) => item.type === "song").length;
  const total = setlistItems.length;
  const addSlot = showAddForm ? <div className="w-full">{addFormNode}</div> : <AddSetlistButton onClick={onOpenAddForm} />;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 border-b border-[#1c171b] pb-4">
        <div>
          <p className="artist-kicker">Live Sequence</p>
          <h2 className="artist-heading">セットリスト</h2>
          <p className="mt-2 text-[10px] font-black text-[#817981]">{songCount} SONGS / {total} ITEMS</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditMode((prev) => !prev)}
          className={`zr-focus min-h-11 border px-4 text-[11px] font-black transition-colors ${isEditMode ? "border-[#1c171b] bg-[#1c171b] text-white" : "border-[#ded8dc] bg-transparent text-[#1c171b]"}`}
        >
          {isEditMode ? "編集を完了" : "順番を編集"}
        </button>
      </div>

      {setlistItems.length === 0 ? (
        <div className="border-b border-[#ded8dc] py-10">
          <Music2 size={28} strokeWidth={1.5} className="mx-auto text-[#f43679]" aria-hidden="true" />
          <p className="mt-4 text-center text-[13px] font-black">この公演のセトリはまだ空です</p>
          <p className="mt-2 text-center text-[11px] font-medium leading-5 text-[#817981]">最初の1曲から、みんなでライブの記録を完成させよう。</p>
          <div className="mt-7">{addSlot}</div>
        </div>
      ) : (
        <div>
          {setlistItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === total - 1;
            const editControls = isEditMode ? (
              <div className="ml-auto flex shrink-0 items-center border-l border-[#ded8dc] pl-1">
                <button type="button" onClick={() => onMove(index, "up")} disabled={isFirst} aria-label="上へ移動" className="zr-focus flex h-11 w-10 items-center justify-center text-[#817981] disabled:opacity-20"><ChevronUp size={17} /></button>
                <button type="button" onClick={() => onMove(index, "down")} disabled={isLast} aria-label="下へ移動" className="zr-focus flex h-11 w-10 items-center justify-center text-[#817981] disabled:opacity-20"><ChevronDown size={17} /></button>
                <button type="button" onClick={() => onRemove(item.id)} aria-label="削除" className="zr-focus flex h-11 w-10 items-center justify-center text-[#f43679]"><X size={17} /></button>
              </div>
            ) : null;

            if (item.type === "encore") {
              return (
                <div key={item.id} className="flex min-h-14 items-center border-b border-[#ded8dc] bg-[#f43679] px-4 text-white">
                  <Sparkles size={17} aria-hidden="true" />
                  <span className="ml-3 text-[11px] font-black tracking-[0.16em]">ENCORE</span>
                  {editControls}
                </div>
              );
            }

            if (item.type === "mc" || item.type === "separator" || item.type === "tag") {
              const label = item.type === "mc" ? "MC" : item.label;
              return (
                <div key={item.id} className="flex min-h-14 items-center border-b border-[#ded8dc] px-4">
                  <Mic2 size={16} strokeWidth={1.7} className="shrink-0 text-[#f43679]" aria-hidden="true" />
                  <span className="ml-3 text-[11px] font-black tracking-[0.08em] text-[#817981]">{label}</span>
                  {editControls}
                </div>
              );
            }

            const num = songNumbers.get(item.id) ?? "";
            return (
              <div key={item.id} className="flex min-h-[68px] items-center border-b border-[#ded8dc] px-4">
                <span className="w-9 shrink-0 font-mono text-[11px] font-black text-[#f43679]">{num.toString().padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 text-[15px] font-black leading-6 tracking-[-0.02em] text-[#1c171b]">{item.title}</span>
                {editControls}
              </div>
            );
          })}
          <div className="mt-6">{addSlot}</div>
        </div>
      )}
    </div>
  );
}
