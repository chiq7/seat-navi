"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";

export type TriState = "yes" | "no" | "unknown";

export const SELECTED_STYLE: CSSProperties = {
  backgroundColor: "#5B2BE0",
  borderColor: "#5B2BE0",
  color: "#fff",
};

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-3.5 shadow-sm">{children}</div>;
}

export function TriToggle({
  value,
  onChange,
}: {
  value: TriState | "";
  onChange: (v: TriState) => void;
}) {
  const opts: { value: TriState; label: string }[] = [
    { value: "yes",     label: "あり" },
    { value: "no",      label: "なし" },
    { value: "unknown", label: "不明" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="flex-1 rounded-xl border py-2 text-xs font-semibold transition-all"
          style={value === o.value
            ? SELECTED_STYLE
            : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#4b5563" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PhotoUpload({
  files,
  previews,
  onChange,
  max = 4,
}: {
  files: File[];
  previews: string[];
  onChange: (files: File[], previews: string[]) => void;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    const toAdd = incoming.slice(0, max - files.length);
    onChange(
      [...files, ...toAdd],
      [...previews, ...toAdd.map((f) => URL.createObjectURL(f))],
    );
    e.target.value = "";
  }

  function handleRemove(idx: number) {
    URL.revokeObjectURL(previews[idx]);
    onChange(
      files.filter((_, i) => i !== idx),
      previews.filter((_, i) => i !== idx),
    );
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
      {previews.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-24 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          {previews.length < max && (
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-2xl text-gray-300"
            >
              ＋
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-200 py-5 text-gray-400 transition hover:border-gray-400"
        >
          <span className="text-2xl">📷</span>
          <span className="text-xs">写真を追加</span>
        </button>
      )}
    </>
  );
}
