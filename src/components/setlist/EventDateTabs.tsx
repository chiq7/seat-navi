import type { CrawledEvent } from "@/lib/types";
import { fmtDateShort } from "@/lib/setlistHelpers";

type Props = {
  sortedEvents: CrawledEvent[];
  selectedEventId: string | null;
  today: string;
  onSelect: (id: string) => void;
};

export function EventDateTabs({
  sortedEvents,
  selectedEventId,
  today,
  onSelect,
}: Props) {
  return (
    <section className="mt-5">
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {sortedEvents.length === 0 && (
          <p className="py-2 text-xs text-gray-400">公演情報を読み込み中...</p>
        )}
        {sortedEvents.map(ev => {
          const isPast = ev.date && ev.date < today;
          const isSelected = ev.id === selectedEventId;
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelect(ev.id)}
              className="shrink-0 rounded-xl border px-3 py-2 text-center transition-all active:scale-95"
              style={
                isSelected
                  ? { background: "#FF6B9D", borderColor: "#FF6B9D", color: "#fff" }
                  : {
                      background: "#fff",
                      borderColor: "#e5e7eb",
                      color: isPast ? "#9ca3af" : "#374151",
                    }
              }
            >
              <p className="text-[11px] font-bold leading-tight">{fmtDateShort(ev.date)}</p>
              <p className="mt-0.5 max-w-[72px] truncate text-[10px] leading-tight opacity-75">
                {ev.venue}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
