"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

export type PostMutationResult = {
  error?: string;
  warning?: string;
};

type Props = {
  value: string;
  label: string;
  maxLength?: number;
  onSave: (value: string) => Promise<PostMutationResult>;
  onDelete: () => Promise<PostMutationResult>;
};

export function MyPostActions({ value, label, maxLength = 500, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    const result = await onSave(draft.trim());
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setEditing(false);
    setMessage(result.warning ?? "保存しました");
  }

  async function remove() {
    setBusy(true);
    setMessage("");
    const result = await onDelete();
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(result.warning ?? "削除しました");
  }

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      {editing ? (
        <div>
          <label className="text-[10px] font-bold text-gray-500">
            {label}
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={maxLength}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-[#FF6B9D]"
            />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(value);
                setEditing(false);
                setMessage("");
              }}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-[10px] font-bold text-gray-500 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-full bg-[#FF6B9D] px-4 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {busy ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : confirmingDelete ? (
        <div className="rounded-xl bg-red-50 px-3 py-2">
          <p className="text-[10px] font-semibold text-red-700">この投稿を削除しますか？元に戻せません。</p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmingDelete(false)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-500 disabled:opacity-50"
            >
              やめる
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="rounded-full bg-red-500 px-4 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {busy ? "削除中..." : "削除する"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(true);
              setMessage("");
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-gray-500"
          >
            <Pencil size={12} />編集
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(true);
              setMessage("");
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-red-400"
          >
            <Trash2 size={12} />削除
          </button>
        </div>
      )}
      {message && <p className="mt-1 text-right text-[9px] text-gray-500">{message}</p>}
    </div>
  );
}
