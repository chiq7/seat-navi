import { Card, Label, SELECTED_STYLE } from "@/components/after-report/AfterReportFormParts";

type Props = {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
};

export function AfterReportFansaCard({ value, onChange }: Props) {
  return (
    <Card>
      <Label>ファンサもらえた？</Label>
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(value === v ? null : v)}
            className="flex-1 rounded-xl border py-2 text-sm font-semibold transition-all"
            style={value === v
              ? SELECTED_STYLE
              : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#4b5563" }}
          >
            {v ? "もらえた！" : "なかった"}
          </button>
        ))}
      </div>
    </Card>
  );
}
