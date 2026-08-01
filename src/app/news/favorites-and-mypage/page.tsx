import type { Metadata } from "next";
import Link from "next/link";
import { Heart, History, LogIn, Sparkles } from "lucide-react";
import { Header } from "@/components/common/Header";

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
    <div className="min-h-screen bg-[#FFF8FB]">
      <Header title="ちけレポからのお知らせ" backHref="/news" />
      <main className="px-4 py-5">
        <article className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#FFF0F6] to-white px-5 py-6">
            <p className="text-[11px] font-bold tracking-[0.08em] text-[#D94878]">機能のお知らせ</p>
            <h1 className="mt-3 text-[24px] font-bold leading-[1.45] text-gray-900">推し登録とマイページの使い方</h1>
            <p className="mt-3 text-[13px] leading-7 text-gray-600">
              よく見るアーティストを登録して、推しの公演を探しやすく。自分の投稿はマイページにまとめて確認できます。
            </p>
          </div>

          <section className="border-t border-pink-100 px-5 py-5">
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

          <section className="border-t border-pink-100 px-5 py-5">
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

          <section className="border-t border-pink-100 px-5 py-5">
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

          <section className="border-t border-pink-100 bg-[#FFF8FB] px-5 py-5">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-gray-900"><Sparkles size={18} className="text-[#FF6B9D]" aria-hidden="true" />まずは推しを登録</h2>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              登録後は、TOPの「推しの公演」から開催予定を確認できます。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/search" className="flex min-h-11 items-center justify-center rounded-xl bg-[#FF6B9D] px-3 py-2.5 text-[13px] font-bold text-white no-underline">推しを探す</Link>
              <Link href="/mypage" className="flex min-h-11 items-center justify-center rounded-xl border border-[#FF6B9D] bg-white px-3 py-2.5 text-[13px] font-bold text-[#D94878] no-underline">マイページを見る</Link>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
