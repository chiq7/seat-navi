"use client";

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="zr-container py-10">
      <h1 className="text-xl font-bold">検索</h1>
      <p role="alert" className="mt-4 text-sm">検索結果を読み込めませんでした。もう一度お試しください。</p>
      <button type="button" onClick={reset} className="zr-focus mt-3 min-h-11 rounded-lg border border-[#d7a6ba] bg-white px-4 font-bold text-[#812c53]">再試行</button>
    </main>
  );
}
