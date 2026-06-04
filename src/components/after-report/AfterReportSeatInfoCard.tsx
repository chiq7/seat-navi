import { Card, Label, SELECTED_STYLE } from "@/components/after-report/AfterReportFormParts";

const INPUT_CLS =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none accent-focus";

const BLOCK_PREFIXES = ["A", "B", "C", "D", "E", "SS", "SA", "SB", "SC", "SD", "SE"];

const SEAT_AREA_OPTIONS = [
  { value: "arena",              label: "アリーナ" },
  { value: "stand_1f",           label: "1階" },
  { value: "stand_2f",           label: "2階" },
  { value: "stand_3f_or_higher", label: "3階" },
  { value: "other_unknown",      label: "その他/不明" },
] as const;

type Props = {
  seatAreaType: string;
  setSeatAreaType: (v: string) => void;
  blockSelect: string;
  setBlockSelect: (v: string) => void;
  blockNum: string;
  setBlockNum: (v: string) => void;
  blockFree: string;
  setBlockFree: (v: string) => void;
  seatRow: string;
  setSeatRow: (v: string) => void;
  seatNumber: string;
  setSeatNumber: (v: string) => void;
};

export function AfterReportSeatInfoCard({
  seatAreaType, setSeatAreaType,
  blockSelect, setBlockSelect, blockNum, setBlockNum, blockFree, setBlockFree,
  seatRow, setSeatRow, seatNumber, setSeatNumber,
}: Props) {
  return (
    <Card>
      <p className="mb-3 text-sm font-bold text-gray-800">
        あなたの席は？<span className="ml-1 text-red-500">*</span>
      </p>

      <div className="mb-3">
        <Label required>席種・エリア</Label>
        <div className="flex flex-wrap gap-1.5">
          {SEAT_AREA_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSeatAreaType(o.value)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
              style={seatAreaType === o.value
                ? SELECTED_STYLE
                : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#4b5563" }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <Label required>ブロック・エリア</Label>
          <select
            value={blockSelect}
            onChange={(e) => {
              setBlockSelect(e.target.value);
              setBlockNum("");
              setBlockFree("");
            }}
            className={INPUT_CLS}
          >
            <option value="">選択してください</option>
            {BLOCK_PREFIXES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
            <option value="other">その他/選択肢なし</option>
          </select>
          {blockSelect && blockSelect !== "other" && (
            <input
              type="text"
              inputMode="numeric"
              value={blockNum}
              onChange={(e) => setBlockNum(e.target.value)}
              placeholder="番号（例: 3）"
              className={`mt-2 ${INPUT_CLS}`}
            />
          )}
          {blockSelect === "other" && (
            <input
              type="text"
              value={blockFree}
              onChange={(e) => setBlockFree(e.target.value)}
              placeholder="例：B3 / 1塁側 / 3階中央 / 注釈席"
              className={`mt-2 ${INPUT_CLS}`}
            />
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={seatRow}
            onChange={(e) => setSeatRow(e.target.value)}
            placeholder="列（例: 5）"
            className={INPUT_CLS}
          />
          <input
            type="text"
            inputMode="numeric"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            placeholder="座席番号（例: 12）"
            className={INPUT_CLS}
          />
        </div>
      </div>
    </Card>
  );
}
