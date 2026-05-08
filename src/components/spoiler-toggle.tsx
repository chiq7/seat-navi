"use client";

type SpoilerToggleProps = {
  enabled: boolean;
  onToggle: (value: boolean) => void;
};

export function SpoilerToggle({ enabled, onToggle }: SpoilerToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs transition-colors hover:border-gray-300"
    >
      <div
        className={`relative h-5 w-9 rounded-full transition-colors ${
          enabled ? "bg-[var(--accent)]" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className={enabled ? "text-gray-700" : "text-gray-400"}>
        ネタバレあり
      </span>
    </button>
  );
}
