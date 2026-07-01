import { Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";

export default function RealtimeFeedSection() {
  return (
    <section className="mt-5">
      <SectionHeader
        icon={<Zap size={16} color="#FF6B9D" />}
        title="リアルタイム速報"
      />
      <div className="mx-4 rounded-2xl border border-gray-100 bg-white py-8 text-center shadow-sm">
        <p className="text-[13px] text-gray-400">まだデータがありません</p>
      </div>
    </section>
  );
}
