import type { Metadata } from "next";
import Link from "next/link";
import { Heart, History, LogIn, Sparkles } from "lucide-react";
import { NewsArticleLayout } from "@/components/news/NewsArticleLayout";

const PAGE_URL = "https://tixrepo.com/news/favorites-and-mypage";

export const metadata: Metadata = {
  title: "推し登録とマイページの使い方｜ちけレポ",
  description: "ちけレポの推し登録とマイページを紹介します。推しの公演をTOPで見つけやすくし、自分の投稿履歴や当選率を確認できます。",
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "推し登録とマイページの使い方｜ちけレポ",
    description: "推しの公演をTOPで見つけやすくする推し登録と、投稿履歴を確認できるマイページを紹介します。",
    url: PAGE_URL,
    type: "article",
    locale: "ja_JP",
  },
};

export default function FavoritesAndMypagePage() {
  return (
    <NewsArticleLayout kicker="FEATURE GUIDE" title="推し登録とマイページの使い方" lead="よく見るアーティストを登録して、推しの公演を探しやすく。自分の投稿はマイページにまとめて確認できます。">
      <div className="border-t border-divider bg-white">
          <section className="border-b border-[#ded8dc] p-5 sm:p-7">
            <div className="flex gap-3">
              <Heart size={21} className="mt-0.5 shrink-0 text-[#FF6B9D]" aria-hidden="true" />
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">推し登録で、TOPを見やすく</h2>
                <p className="mt-2 text-[13px] leading-7 text-gray-700">
                  アーティストページや検索結果のハートボタンから推し登録すると、TOPで推しの公演を優先して表示します。開催が近い公演を探す手間を減らせます。
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-[#ded8dc] p-5 sm:p-7">
            <div className="flex gap-3">
              <History size={21} className="mt-0.5 shrink-0 text-[#FF6B9D]" aria-hidden="true" />
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">マイページで自分の記録を確認</h2>
                <p className="mt-2 text-[13px] leading-7 text-gray-700">
                  マイページでは、推しアーティスト、自分が投稿した当落・座席・現地レポなどの履歴、投稿内容から集計した当選率を確認できます。
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-[#ded8dc] p-5 sm:p-7">
            <div className="flex gap-3">
              <LogIn size={21} className="mt-0.5 shrink-0 text-[#FF6B9D]" aria-hidden="true" />
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">利用にはログインが必要です</h2>
                <p className="mt-2 text-[13px] leading-7 text-gray-700">
                  推し登録とマイページの利用にはログインが必要です。投稿だけはログイン前でもできますが、ログインして投稿すると自分の履歴へ保存されます。
                </p>
              </div>
            </div>
          </section>

          <section className="bg-[#fff0f5] p-5 sm:p-7">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-gray-900"><Sparkles size={18} className="text-[#FF6B9D]" aria-hidden="true" />まずは推しを登録</h2>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              登録後は、TOPの「推しの公演」から開催予定を確認できます。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/search" className="zr-focus flex min-h-12 items-center justify-center bg-[#f43679] px-3 py-2.5 text-[13px] font-black text-white no-underline">推しを探す</Link>
              <Link href="/mypage" className="zr-focus flex min-h-12 items-center justify-center border border-[#f43679] bg-white px-3 py-2.5 text-[13px] font-black text-[#D94878] no-underline">マイページを見る</Link>
            </div>
          </section>
      </div>
    </NewsArticleLayout>
  );
}
