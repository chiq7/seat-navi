import { Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";
import RealtimeFeedItem from "./RealtimeFeedItem";
import type { HomeFeedItem } from "@/lib/homeData";

type RealtimeFeedSectionProps = {
  items: HomeFeedItem[];
};

export default function RealtimeFeedSection({ items }: RealtimeFeedSectionProps) {
  return (
    <section className="zr-section bg-[#fff0f5] text-[#2b252b]">
      <div className="zr-container">
      <SectionHeader
        icon={<Zap size={16} color="#FF6B9D" />}
        title="リアルタイム速報"
      />
      {items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <RealtimeFeedItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white px-4 py-8 text-center">
          <p className="text-[13px] text-gray-400">まだデータがありません</p>
        </div>
      )}
      </div>
    </section>
  );
}
