import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/common/Header";
import { SEO_VENUES } from "@/lib/venueSeo";

export const metadata: Metadata = {
  title: "ライブ会場一覧｜公演予定・座席情報",
  description:
    "東京ドーム、Kアリーナ横浜、横浜アリーナなど主要ライブ会場の公演予定、座席報告、アリーナ予想を確認できます。",
  alternates: { canonical: "https://tixrepo.com/venues" },
};

export default function VenuesPage() {
  return (
    <main className="min-h-screen bg-[#FFF8FB] pb-10">
      <Header title="ライブ会場一覧" backHref="/" />
      <div className="px-4 pt-5">
        <h1 className="text-xl font-bold text-gray-900">ライブ会場の公演・座席情報</h1>
        <p className="mt-2 text-[12px] leading-6 text-gray-500">
          会場ごとの公演予定から、当落・座席報告・アリーナ予想を確認できます。
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2">
          {SEO_VENUES.map((venue) => (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="rounded-xl border border-pink-100 bg-white px-4 py-3 shadow-sm transition-transform active:scale-[0.99]"
            >
              <span className="text-[14px] font-bold text-gray-900">{venue.name}</span>
              <span className="mt-1 block text-[11px] text-gray-400">公演予定・座席情報を見る</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

