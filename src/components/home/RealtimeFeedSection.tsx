"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";
import RealtimeFeedItem from "./RealtimeFeedItem";
import { getRealtimeFeedItems, type HomeFeedItem } from "@/lib/homeData";

export default function RealtimeFeedSection() {
  const [items, setItems] = useState<HomeFeedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRealtimeFeedItems().then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSupplementalItems = items?.some((item) => item.source !== "real") ?? false;

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
      {items && items.length > 0 ? (
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
