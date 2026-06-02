import Link from "next/link";

export function SetlistSection({ slug }: { slug: string }) {
  return (
    <section id="section-setlist" className="mt-5 px-4 scroll-mt-16">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        セトリ・曲順
      </h3>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-red-500">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          ネタバレを含む可能性があります
        </p>
        <div className="space-y-2.5">
          <Link
            href={`/artists/${slug}/setlist`}
            className="block w-full rounded-xl border-2 py-3.5 text-center text-sm font-semibold active:scale-[0.98] transition-transform"
            style={{ borderColor: "#006876", color: "#006876" }}
          >
            セトリを見る
          </Link>
          <Link
            href={`/artists/${slug}/setlist`}
            className="block w-full rounded-xl bg-gray-100 py-3.5 text-center text-sm font-semibold text-gray-600 active:scale-[0.98] transition-transform"
          >
            セトリを投稿する
          </Link>
        </div>
      </div>
    </section>
  );
}
