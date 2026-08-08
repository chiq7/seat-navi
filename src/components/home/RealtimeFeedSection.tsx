import { ChevronDown, Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";
import RealtimeFeedItem from "./RealtimeFeedItem";
import type { HomeFeedItem } from "@/lib/homeData";

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
        <div className="grid gap-3 md:grid-cols-2">
          {visibleItems.map((item) => (
            <RealtimeFeedItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white px-4 py-8 text-center">
          <p className="text-[13px] text-gray-400">まだデータがありません</p>
        </div>
      )}
      {remainingItems.length > 0 && (
        <details className="group mt-5">
          <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-white px-5 text-[12px] font-black text-[#d83d72]">
            残り{remainingItems.length}件の速報を見る
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {remainingItems.map((item) => <RealtimeFeedItem key={item.id} item={item} />)}
          </div>
        </details>
      )}
      </div>
    </section>
  );
}
