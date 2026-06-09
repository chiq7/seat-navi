export const BLOCK_PREFIXES = ["A", "B", "C", "D", "E", "SS", "SA", "SB", "SC", "SD", "SE"];

export const LOTTERY_OPTIONS = [
  { value: "fc1", label: "1次抽選", resultLabel: "1次抽選" },
  { value: "fc2", label: "2次抽選", resultLabel: "2次抽選" },
  { value: "other", label: "その他", resultLabel: "その他" },
] as const;

export const SELECTED_STYLE = {
  backgroundColor: "#5B2BE0",
  borderColor: "#5B2BE0",
  color: "#fff",
};

export const DEFAULT_STYLE = {
  borderColor: "#e5e7eb",
  backgroundColor: "#fff",
  color: "#4b5563",
};

export const COMPACT_INPUT_CLS =
  "min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-2 text-[11px] outline-none accent-focus";
export const COMPACT_BUTTON_CLS =
  "rounded-lg border px-1 py-1.5 text-[10px] font-bold leading-tight transition-all";
export const PROGRESSIVE_GROUP_CLS = "border-t border-cyan-200/70 pt-3";
