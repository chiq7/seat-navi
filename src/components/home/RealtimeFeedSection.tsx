import { Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";
import RealtimeFeedItem from "./RealtimeFeedItem";
import type { HomeFeedItem } from "@/lib/homeData";

type RealtimeFeedSectionProps = {
  items: HomeFeedItem[];
};

export default function RealtimeFeedSection({ items }: RealtimeFeedSectionProps) {
  return (
    <section className="zr-section bg-[#171117] text-white">
      <div className="zr-container">
      <SectionHeader
        icon={<Zap size={16} color="#FF6B9D" />}
        title="リアルタイム速報"
      />
      <div className="border-t border-white/18">
      {items.length > 0 ? (
        <div className="grid md:grid-cols-2">
          {items.map((item) => (
            <RealtimeFeedItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-gray-400">まだデータがありません</p>
        </div>
      )}
      </div>
      </div>
    </section>
  );
}
