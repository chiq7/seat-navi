import type { ColorMode, ArenaCell } from "./arenaMapTypes";

// ─── 色定数 ────────────────────────────────────────────────────────────────

const LEGEND_RED    = "#EF4444";
const LEGEND_GREEN  = "#22C55E";
const LEGEND_YELLOW = "#F59E0B";
const LEGEND_BLUE   = "#3B82F6";

export const REPORTED_FILL   = "#5B2BE0";
export const UNREPORTED_FILL = "#F6F4FB";
export const GRID_STROKE     = "#E3DEF2";

// ─── カラーパレット ────────────────────────────────────────────────────────

const LOTTERY_COLORS: Record<string, string> = {
  fc1:        LEGEND_RED,
  fc2:        LEGEND_GREEN,
  other:      LEGEND_YELLOW,
  general:    LEGEND_BLUE,
  upgrade:    LEGEND_BLUE,
  revival:    LEGEND_YELLOW,
  production: LEGEND_BLUE,
};

const FC_HISTORY_COLORS: Record<string, string> = {
  over_3_years:       LEGEND_RED,
  one_to_three_years: LEGEND_GREEN,
  under_1_year:       LEGEND_YELLOW,
};

const PAYMENT_COLORS: Record<string, string> = {
  credit:      LEGEND_RED,
  convenience: LEGEND_YELLOW,
  other:       LEGEND_GREEN,
};

const TICKET_COUNT_COLORS: Record<string, string> = {
  "4": LEGEND_RED,
  "3": LEGEND_GREEN,
  "2": LEGEND_YELLOW,
  "1": LEGEND_BLUE,
};

const UPGRADE_COLORS = {
  yes: LEGEND_RED,
  no:  LEGEND_GREEN,
};

// ─── モードオプション / 凡例 ────────────────────────────────────────────────

export const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; disabled?: boolean }[] = [
  { value: "lottery",    label: "抽選順" },
  { value: "fcHistory",  label: "FC歴" },
  { value: "ticketCount", label: "枚数", disabled: true },
  { value: "payment",    label: "支払い" },
  { value: "upgrade",    label: "アプグレ" },
];

export const COLOR_MODE_LEGENDS: Record<ColorMode, { label: string; color: string }[]> = {
  lottery: [
    { label: "1次抽選", color: LOTTERY_COLORS.fc1 },
    { label: "2次抽選", color: LOTTERY_COLORS.fc2 },
    { label: "その他",  color: LOTTERY_COLORS.other },
  ],
  fcHistory: [
    { label: "3年以上",  color: FC_HISTORY_COLORS.over_3_years },
    { label: "1〜3年",   color: FC_HISTORY_COLORS.one_to_three_years },
    { label: "1年未満",  color: FC_HISTORY_COLORS.under_1_year },
  ],
  ticketCount: [
    { label: "4枚", color: TICKET_COUNT_COLORS["4"] },
    { label: "3枚", color: TICKET_COUNT_COLORS["3"] },
    { label: "2枚", color: TICKET_COUNT_COLORS["2"] },
    { label: "1枚", color: TICKET_COUNT_COLORS["1"] },
  ],
  payment: [
    { label: "クレカ", color: PAYMENT_COLORS.credit },
    { label: "その他", color: LEGEND_GREEN },
  ],
  upgrade: [
    { label: "有",   color: UPGRADE_COLORS.yes },
    { label: "なし", color: UPGRADE_COLORS.no },
  ],
};

// ─── 色決定純粋関数 ──────────────────────────────────────────────────────────

export function cellFillColor(cell: ArenaCell, colorMode: ColorMode): string {
  switch (colorMode) {
    case "lottery":
      return LOTTERY_COLORS[cell.lotteryType] ?? REPORTED_FILL;
    case "fcHistory":
      return cell.fcHistory ? (FC_HISTORY_COLORS[cell.fcHistory] ?? REPORTED_FILL) : REPORTED_FILL;
    case "payment":
      if (cell.paymentMethod === "credit") return LEGEND_RED;
      if (cell.paymentMethod) return LEGEND_GREEN;
      return REPORTED_FILL;
    case "upgrade":
      return cell.lotteryType === "upgrade" ? UPGRADE_COLORS.yes : UPGRADE_COLORS.no;
    default:
      return REPORTED_FILL;
  }
}
