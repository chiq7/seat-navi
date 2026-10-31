"use client";

import Link from "next/link";

export default function ArtistContentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="zr-container py-12">
      <h1 className="text-xl font-bold text-[#40383d]">情報を読み込めませんでした</h1>
      <p className="mt-3 text-sm leading-7 text-[#665761]">
        公演や投稿の情報を取得できていません。時間をおいて、もう一度お試しください。
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="zr-focus min-h-12 rounded-xl bg-[#f43679] px-5 py-3 text-sm font-bold text-white">
          もう一度読み込む
        </button>
        <Link href="/artists" className="zr-focus flex min-h-12 items-center rounded-xl border border-[#ded8dc] px-5 py-3 text-sm font-bold text-[#40383d]">
          アーティスト一覧へ
        </Link>
      </div>
    </main>
  );
}
