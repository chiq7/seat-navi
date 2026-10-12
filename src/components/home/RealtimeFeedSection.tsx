import { ChevronRight, Zap } from "lucide-react";
import type { HomeFeedItem } from "@/lib/homeData";
import { EmptyState } from "@/components/common/EmptyState";
import RealtimeFeedItem from "./RealtimeFeedItem";

type RealtimeFeedSectionProps = {
  items: HomeFeedItem[];
};

type ArtistFeedGroup = {
  artistName: string;
  items: HomeFeedItem[];
};

function groupItemsByArtist(items: HomeFeedItem[]): ArtistFeedGroup[] {
  const groups = new Map<string, ArtistFeedGroup>();

  for (const item of items) {
    const group = groups.get(item.artistName);
    if (group) {
      group.items.push(item);
      continue;
    }

    groups.set(item.artistName, { artistName: item.artistName, items: [item] });
  }

  return [...groups.values()];
}

export default function RealtimeFeedSection({ items }: RealtimeFeedSectionProps) {
  const artistGroups = groupItemsByArtist(items);

  return (
    <section className="bg-[#fff0f5] py-6 text-[#2b252b] sm:py-8">
      <div className="zr-container">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#e84a80]">
              <Zap size={16} aria-hidden="true" />
            </span>
            <h2 className="text-[18px] font-black tracking-[-0.04em]">リアルタイム速報</h2>
          </div>
          {artistGroups.length > 1 && (
            <ChevronRight className="text-[#d83d72]" size={18} aria-hidden="true" />
          )}
        </div>

        {artistGroups.length > 0 ? (
          <div
            aria-label="アーティストごとの最新速報。横にスクロールできます"
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain pb-2 pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d83d72]"
            role="list"
            tabIndex={0}
            style={{ scrollbarWidth: "thin", scrollbarColor: "#e7b8ca transparent" }}
          >
            {artistGroups.map((group) => (
              <section
                key={group.artistName}
                aria-label={`${group.artistName}の速報`}
                className="w-[min(82vw,300px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#eadfe4] bg-white sm:w-[320px]"
                role="listitem"
              >
                <h3 className="border-b border-[#f1e6eb] px-3.5 py-2.5 text-[13px] font-black text-[#b72f5d]">
                  {group.artistName}
                </h3>
                <div className="divide-y divide-[#f1e6eb] px-3.5">
                  {group.items.map((item) => (
                    <RealtimeFeedItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="今日の速報はまだありません" icon={<Zap size={18} aria-hidden="true" />} />
        )}
      </div>
    </section>
  );
}
