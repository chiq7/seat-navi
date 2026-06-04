import { Card, Label } from "@/components/after-report/AfterReportFormParts";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function AfterReportMemoCard({ value, onChange }: Props) {
  return (
    <Card>
      <Label>感想メモ</Label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="公演の感想・気づいたことなど（任意）"
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none accent-focus"
      />
    </Card>
  );
}
