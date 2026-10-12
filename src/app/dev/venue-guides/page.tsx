import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { venueGuideInventory } from "@/data/venueGuides/inventory";
import { PUBLIC_VENUE_GUIDE_IDS } from "@/lib/publicVenueGuides";

export const metadata: Metadata = {
  title: "会場ガイドのローカル確認一覧 | ちけレポ",
  robots: { index: false, follow: false },
};

export default function VenueGuidePreviewIndex() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="zr-container py-8 sm:py-12">
      <p className="text-sm font-semibold text-accent-dark">会場ガイドのローカル確認</p>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">全26会場の確認一覧</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">
        座席・設備・アクセス・荷物の一次制作を確認できます。会場ごとに番号検索の範囲や未確認項目が異なります。
        ローカル版には、公開ページへ未反映の追加内容も含まれます。
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {venueGuideInventory.map(venue => (
          <li key={venue.venueId}>
            <Link
              href={venue.venueId === "tokyo-dome" ? "/venues/tokyo-dome" : `/dev/venue-guides/${venue.venueId}`}
              className="flex h-full min-h-24 flex-col justify-between gap-3 rounded-xl border border-divider bg-white p-5 transition-colors hover:border-accent-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-dark"
            >
              <span className="font-semibold leading-6">{venue.name}</span>
              <span className="flex items-center justify-between gap-3 text-xs text-gray-600">
                <span>{PUBLIC_VENUE_GUIDE_IDS.includes(venue.venueId) ? "公開ガイドあり・ローカル版を確認" : "ローカル版・公開へ未反映"}</span>
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
