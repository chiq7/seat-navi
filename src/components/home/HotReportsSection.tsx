import { Flame } from "lucide-react";
import SectionHeader from "./SectionHeader";

export default function HotReportsSection() {
  return (
    <section className="mt-4">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title="報告急増中の公演"
      />
      <div className="mx-4 rounded-2xl border border-gray-100 bg-white py-8 text-center shadow-sm">
        <p className="text-[13px] text-gray-400">まだデータがありません</p>
      </div>
    </section>
  );
}
