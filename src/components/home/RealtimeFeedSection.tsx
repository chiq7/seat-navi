import { ChevronDown, Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";
import RealtimeFeedItem from "./RealtimeFeedItem";
import type { HomeFeedItem } from "@/lib/homeData";
import { EmptyState } from "@/components/common/EmptyState";

type RealtimeFeedSectionProps = {
  items: HomeFeedItem[];
};

export default function RealtimeFeedSection({ items }: RealtimeFeedSectionProps) {
  const visibleItems = items.slice(0, 4);
  const remainingItems = items.slice(4);

  return (
    <section className="zr-section bg-[#fff0f5] text-[#2b252b]">
      <div className="zr-container">
      <SectionHeader
        icon={<Zap size={16} color="#FF6B9D" />}
        title="リアルタイム速報"
      />
      {items.length > 0 ? (
        <div className="overflow-hidden border-y border-[#eadfe4] md:grid md:grid-cols-2 md:border-x">
          {visibleItems.map((item) => (
            <RealtimeFeedItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState title="今日の速報はまだありません" icon={<Zap size={18} aria-hidden="true" />} />
      )}
      {remainingItems.length > 0 && (
        <details className="group mt-5">
          <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-white px-5 text-[12px] font-black text-[#d83d72]">
            残り{remainingItems.length}件の速報を見る
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 overflow-hidden border-y border-[#eadfe4] md:grid md:grid-cols-2 md:border-x">
            {remainingItems.map((item) => <RealtimeFeedItem key={item.id} item={item} />)}
          </div>
        </details>
      )}
      </div>
    </section>
  );
}
