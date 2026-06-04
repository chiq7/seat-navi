import { Card, Label } from "@/components/after-report/AfterReportFormParts";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function AfterReportTapeCard({ value, onChange }: Props) {
  return (
    <Card>
      <Label>銀テープ飛距離（何列目まで飛んできた？）</Label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例: 10"
          className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none accent-focus"
        />
        <span className="text-sm text-gray-500">列目</span>
      </div>
    </Card>
  );
}
