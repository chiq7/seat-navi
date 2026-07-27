import { Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";
import RealtimeFeedItem from "./RealtimeFeedItem";
import type { HomeFeedItem } from "@/lib/homeData";

type RealtimeFeedSectionProps = {
  items: HomeFeedItem[];
};

export default function RealtimeFeedSection({ items }: RealtimeFeedSectionProps) {

  const hasSupplementalItems = items.some((item) => item.source !== "real");

  return (
    <section className="mt-3">
      <SectionHeader
        icon={<Zap size={16} color="#FF6B9D" />}
        title="リアルタイム速報"
      />
      {hasSupplementalItems && (
        <p className="mx-4 mb-1.5 text-[10px] leading-relaxed text-gray-400">
          編集部投稿・投稿イメージを含みます（集計対象外）
        </p>
      )}
      <div className="mx-4 rounded-xl border border-gray-100 bg-white shadow-sm">
      {items.length > 0 ? (
        <div className="divide-y divide-gray-100">
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
    </section>
  );
}
