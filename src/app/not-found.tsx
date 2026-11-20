import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/common/Header";
import { NotFoundDocumentHead } from "@/components/common/NotFoundDocumentHead";

export const metadata: Metadata = {
  title: "ページが見つかりません｜ちけレポ",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main data-site-not-found>
      <NotFoundDocumentHead />
      <Header title="ちけレポ" breadcrumbLabel="ページが見つかりません" existingBreadcrumbSchema backHref="/" backLabel="トップへ戻る" />
      <section className="zr-container mx-auto max-w-xl py-12">
        <p className="text-sm font-bold text-[#9b2455]">404</p>
        <h1 className="mt-2 text-2xl font-black">ページが見つかりません</h1>
        <p className="mt-3 text-sm leading-6">公演名や会場名から、お探しのページを検索できます。</p>
        <form action="/search" method="get" role="search" className="mt-7">
          <label htmlFor="missing-page-query" className="text-sm font-bold">サイト内検索</label>
          <div className="mt-2 flex gap-2">
            <input id="missing-page-query" name="q" type="search" required
              placeholder="公演・アーティスト・会場名" className="zr-focus min-h-12 min-w-0 flex-1 rounded-xl border border-divider bg-white px-3 text-base" />
            <button type="submit" className="zr-focus min-h-12 rounded-xl bg-[#a42959] px-5 font-bold text-white">検索</button>
          </div>
        </form>
        <nav aria-label="ページを探す" className="mt-5 flex flex-wrap gap-x-6">
          <Link href="/" className="zr-focus inline-flex min-h-11 items-center font-bold text-[#9b2455] underline">トップへ戻る</Link>
          <Link href="/venues" className="zr-focus inline-flex min-h-11 items-center font-bold text-[#9b2455] underline">会場一覧を見る</Link>
        </nav>
      </section>
    </main>
  );
}
