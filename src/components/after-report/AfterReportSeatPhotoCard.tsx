import { Card, PhotoUpload } from "@/components/after-report/AfterReportFormParts";

type Props = {
  files: File[];
  previews: string[];
  onChange: (files: File[], previews: string[]) => void;
};

export function AfterReportSeatPhotoCard({ files, previews, onChange }: Props) {
  return (
    <Card>
      <p className="mb-1 text-xs font-bold text-gray-700">
        あなたの席からの写真
        <span className="ml-1.5 text-[10px] font-normal text-gray-400">（任意）</span>
      </p>
      <p className="mb-2.5 text-[11px] text-gray-500">
        席からの見え方が分かる写真があれば追加してください。
      </p>
      <PhotoUpload files={files} previews={previews} onChange={onChange} />
      <p className="mt-1.5 text-[10px] text-gray-400">
        ※顔・座席番号・チケット情報は隠してください。
      </p>
    </Card>
  );
}
