import type { EditableItem } from "@/lib/setlistHelpers";
import { ItemControls } from "./ItemControls";

type Props = {
  setlistItems: EditableItem[];
  songNumbers: Map<string, string>;
  onMove: (index: number, dir: "up" | "down") => void;
  onRemove: (id: string) => void;
};

export function SetlistItemsSection({ setlistItems, songNumbers, onMove, onRemove }: Props) {
  const songCount = setlistItems.filter(i => i.type === "song").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

      {/* カードヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span className="text-xs font-bold" style={{ color: "#006876" }}>セトリ</span>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
          {songCount}曲
        </span>
      </div>

      {/* 曲リスト */}
      {setlistItems.length === 0 ? (
        <p className="p-8 text-center text-xs text-gray-400">
          セトリはまだ投稿されていません
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {setlistItems.map((item, index) => {
            const total = setlistItems.length;
            const controls = (
              <ItemControls
                index={index}
                total={total}
                onUp={() => onMove(index, "up")}
                onDown={() => onMove(index, "down")}
                onRemove={() => onRemove(item.id)}
              />
            );

            if (item.type === "mc") {
              return (
                <div key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-400">
                    MC
                  </span>
                  {controls}
                </div>
              );
            }

            if (item.type === "encore") {
              return (
                <div key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-bold"
                    style={{ background: "rgba(0,104,118,0.08)", color: "#006876" }}
                  >
                    アンコール
                  </span>
                  {controls}
                </div>
              );
            }

            if (item.type === "separator") {
              return (
                <div key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    {item.label}
                  </span>
                  {controls}
                </div>
              );
            }

            if (item.type === "tag") {
              return (
                <div key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-semibold text-purple-600">
                    {item.label}
                  </span>
                  {controls}
                </div>
              );
            }

            // song
            const num = songNumbers.get(item.id) ?? "";
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className="w-7 shrink-0 text-right text-[11px] font-bold text-gray-300">
                  {num}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">
                  {item.title}
                </span>
                {controls}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
