"use client";

import { ChevronDown, Zap } from "lucide-react";
import type { HomeFeedItem } from "@/lib/homeData";
import { EmptyState } from "@/components/common/EmptyState";
import RealtimeFeedItem from "./RealtimeFeedItem";
import { formatPublicDataTime, publicPageDataPaths, publicPageRefreshSeconds, type PublicFeed } from "@/lib/publicPageData";
import { useFreshPublicData } from "@/lib/useFreshPublicData";
import { filterPublishedFeedItems } from "@/lib/realtimeFeed";

type RealtimeFeedSectionProps = {
  items?: HomeFeedItem[];
  live?: boolean;
};

export default function RealtimeFeedSection({ items, live }: RealtimeFeedSectionProps) {
  const { data, failed, staleAt, lastSuccessAt, refreshing, retry } = useFreshPublicData<PublicFeed | null>(
    live ? publicPageDataPaths.feed : undefined, publicPageRefreshSeconds.feed, items ?? null,
  );
  const publishedItems = filterPublishedFeedItems(data ?? [])
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <section className="bg-[#fff0f5] py-6 text-[#2b252b] sm:py-8" data-realtime-feed>
      <div className="zr-container">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#e84a80]">
              <Zap size={16} aria-hidden="true" />
            </span>
            <h2 className="text-[18px] font-black tracking-[-0.04em]">{staleAt ? "保存済みの公演速報" : "リアルタイム速報"}</h2>
          </div>
        </div>

        {failed && (
          <p className="mb-2 text-sm" role="status">速報を更新できませんでした。{lastSuccessAt && "前回の表示を残しています。"}<button type="button" className="zr-focus ml-2 min-h-11 underline" onClick={retry}>再試行</button></p>
        )}
        {!staleAt && lastSuccessAt && <p className="mb-2 text-xs text-[#68525e]">最終確認：<time dateTime={lastSuccessAt}>{formatPublicDataTime(lastSuccessAt)}</time>{refreshing && " · 更新中"}</p>}
        {staleAt && <p className="mb-2 text-sm" role="status">{formatPublicDataTime(staleAt)}に保存した速報です。現在の受付状況は公式案内をご確認ください。</p>}
        {publishedItems.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[#eadfe4] bg-white">
            <ol className="divide-y divide-[#f1e6eb] px-3.5" aria-label="最新の速報">
              {publishedItems.slice(0, 3).map(item => <li key={item.id}>
                <RealtimeFeedItem item={item} saved={Boolean(staleAt)} />
              </li>)}
            </ol>
            {publishedItems.length > 3 && <details className="group border-t border-[#f1e6eb]">
              <summary className="zr-focus flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 text-xs font-bold text-[#90254f]">
                残り{publishedItems.length - 3}件を見る<ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" />
              </summary>
              <div className="max-h-[360px] overflow-y-auto overscroll-y-contain px-3.5" tabIndex={0} aria-label="続きの速報">
                <ol className="divide-y divide-[#f1e6eb]" start={4}>
                  {publishedItems.slice(3).map(item => <li key={item.id}><RealtimeFeedItem item={item} saved={Boolean(staleAt)} /></li>)}
                </ol>
              </div>
            </details>}
          </div>
        ) : data === null ? (
          !failed && <div className="min-h-[104px] rounded-xl bg-white px-4 py-5 text-sm" role="status">速報を読み込み中です</div>
        ) : (
          <EmptyState title={staleAt ? "表示できる保存済みの速報はありません" : "公開されている速報はまだありません"} icon={<Zap size={18} aria-hidden="true" />} />
        )}
      </div>
    </section>
  );
}
