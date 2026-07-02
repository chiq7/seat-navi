import Link from "next/link";

export default function HomeHeader() {
  return (
    <header className="bg-white px-4 py-2.5 flex items-center gap-3">
      <Link href="/" className="shrink-0">
        <span
          style={{
            color: "#FF6B9D",
            fontSize: "18px",
            fontWeight: 700,
            fontFamily: "'Noto Sans JP', sans-serif",
          }}
        >
          ちけレポ
        </span>
      </Link>

      <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 h-[44px]">
        <svg
          className="w-4 h-4 shrink-0 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span className="text-sm text-gray-400 truncate">
          アーティスト・公演名を検索
        </span>
      </div>
    </header>
  );
}
